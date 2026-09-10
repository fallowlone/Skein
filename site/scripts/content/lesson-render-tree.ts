import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseModule } from "acorn";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";
import remarkSmartypants from "remark-smartypants";
import { unified } from "unified";
import type { Root } from "mdast";
import { parseFrontmatter } from "../supabase/corpus";

export const LESSON_RENDER_TREE_FORMAT = "lesson-render-tree-v1" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type LessonRenderNode =
  | { type: "text"; value: string }
  | { type: "raw"; value: string }
  | {
      type: "element";
      name: string;
      props?: Record<string, JsonValue>;
      children?: LessonRenderNode[];
    };

export interface LessonComponentRef {
  source: string;
  export: string;
}

export interface LessonRenderTreeArtifact {
  format: typeof LESSON_RENDER_TREE_FORMAT;
  sourceHash: string;
  compilerHash: string;
  artifactHash: string;
  dependencies: Record<string, string>;
  components: Record<string, LessonComponentRef>;
  root: LessonRenderNode[];
}

type EstreeNode = Record<string, any>;
type MdNode = Record<string, any>;
type StaticBindings = Readonly<Record<string, JsonValue>>;
type StaticEvalOptions = {
  jsx?: (node: EstreeNode, context: string, bindings: StaticBindings) => JsonValue;
};

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkGfm)
  .use(remarkSmartypants);

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
let compilerHashPromise: Promise<string> | undefined;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function renderTreeCompilerHash(): Promise<string> {
  compilerHashPromise ??= (async () => {
    const [compilerSource, ...packageJson] = await Promise.all([
      readFile(fileURLToPath(import.meta.url), "utf8"),
      ...["acorn", "remark-parse", "remark-mdx", "remark-gfm", "remark-smartypants", "unified"]
        .map((name) => readFile(resolve(siteRoot, "node_modules", name, "package.json"), "utf8")),
    ]);
    return sha256(JSON.stringify({
      format: LESSON_RENDER_TREE_FORMAT,
      compiler: sha256(compilerSource),
      packages: packageJson.map((raw) => {
        const pkg = JSON.parse(raw) as { name?: string; version?: string };
        return [pkg.name ?? "unknown", pkg.version ?? "unknown"];
      }),
    }));
  })();
  return compilerHashPromise;
}

function asJson(value: unknown, context: string): JsonValue {
  if (value === undefined) return null;
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map((item) => asJson(item, context));
  if (typeof value === "object") {
    const out: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = asJson(item, context);
    }
    return out;
  }
  throw new Error(`${context}: expression is not JSON-serializable (${typeof value})`);
}

function propertyKey(node: EstreeNode, context: string): string {
  if (node.type === "Identifier") return node.name;
  if (node.type === "Literal") return String(node.value);
  throw new Error(`${context}: unsupported object key ${node.type}`);
}

function bindPattern(
  pattern: EstreeNode,
  value: JsonValue,
  bindings: Record<string, JsonValue>,
  context: string,
): void {
  if (pattern.type === "Identifier") {
    bindings[pattern.name] = value;
    return;
  }
  if (pattern.type === "ArrayPattern") {
    if (!Array.isArray(value)) throw new Error(`${context}: array destructuring requires an array`);
    pattern.elements.forEach((item: EstreeNode | null, index: number) => {
      if (item) bindPattern(item, value[index] ?? null, bindings, context);
    });
    return;
  }
  throw new Error(`${context}: unsupported binding pattern ${pattern.type}`);
}

function evaluateArrowFunction(
  fn: EstreeNode,
  args: JsonValue[],
  context: string,
  bindings: StaticBindings,
  options: StaticEvalOptions,
): JsonValue {
  if (fn.type !== "ArrowFunctionExpression") {
    throw new Error(`${context}: map callback must be an arrow function`);
  }
  const local: Record<string, JsonValue> = { ...bindings };
  fn.params.forEach((param: EstreeNode, index: number) => {
    bindPattern(param, args[index] ?? null, local, context);
  });
  if (fn.body.type !== "BlockStatement") {
    return evaluateStaticExpression(fn.body, context, local, options);
  }
  for (const statement of fn.body.body) {
    if (statement.type === "VariableDeclaration") {
      for (const declaration of statement.declarations) {
        const value = declaration.init
          ? evaluateStaticExpression(declaration.init, context, local, options)
          : null;
        bindPattern(declaration.id, value, local, context);
      }
      continue;
    }
    if (statement.type === "ReturnStatement") {
      return statement.argument
        ? evaluateStaticExpression(statement.argument, context, local, options)
        : null;
    }
    throw new Error(`${context}: unsupported arrow statement ${statement.type}`);
  }
  return null;
}

/**
 * Evaluate only deterministic JSON-like ESTree expressions authored in lesson
 * MDX props. This is deliberately an interpreter, not eval/new Function: the
 * publish pipeline may consume trusted git content, but the resulting artifact
 * must stay data-only so Cloudflare never executes lesson source at runtime.
 */
export function evaluateStaticExpression(
  node: EstreeNode,
  context = "mdx expression",
  bindings: StaticBindings = {},
  options: StaticEvalOptions = {},
): JsonValue {
  switch (node?.type) {
    case "Literal":
      return asJson(node.value, context);
    case "Identifier":
      if (node.name === "undefined") return null;
      if (node.name === "NaN" || node.name === "Infinity") {
        throw new Error(`${context}: non-finite number ${node.name} is not JSON-serializable`);
      }
      if (Object.prototype.hasOwnProperty.call(bindings, node.name)) return bindings[node.name];
      throw new Error(`${context}: unresolved identifier ${node.name}`);
    case "ArrayExpression":
      return node.elements.map((entry: EstreeNode | null) =>
        entry ? evaluateStaticExpression(entry, context, bindings, options) : null,
      );
    case "ObjectExpression": {
      const out: Record<string, JsonValue> = {};
      for (const prop of node.properties) {
        if (prop.type === "SpreadElement") {
          const spread = evaluateStaticExpression(prop.argument, context, bindings, options);
          if (!spread || Array.isArray(spread) || typeof spread !== "object") {
            throw new Error(`${context}: object spread must resolve to an object`);
          }
          Object.assign(out, spread);
          continue;
        }
        if (prop.type !== "Property" || prop.kind !== "init" || prop.method) {
          throw new Error(`${context}: unsupported object property ${prop.type}`);
        }
        const key = prop.computed
          ? String(evaluateStaticExpression(prop.key, context, bindings, options))
          : propertyKey(prop.key, context);
        out[key] = evaluateStaticExpression(prop.value, `${context}.${key}`, bindings, options);
      }
      return out;
    }
    case "UnaryExpression": {
      const value = evaluateStaticExpression(node.argument, context, bindings, options);
      if (node.operator === "!" ) return !value;
      if (node.operator === "+" && typeof value === "number") return value;
      if (node.operator === "-" && typeof value === "number") return -value;
      throw new Error(`${context}: unsupported unary expression ${node.operator}`);
    }
    case "BinaryExpression": {
      const left = evaluateStaticExpression(node.left, context, bindings, options) as any;
      const right = evaluateStaticExpression(node.right, context, bindings, options) as any;
      switch (node.operator) {
        case "+": return asJson(left + right, context);
        case "-": return asJson(left - right, context);
        case "*": return asJson(left * right, context);
        case "/": return asJson(left / right, context);
        case "%": return asJson(left % right, context);
        case "===": return left === right;
        case "!==": return left !== right;
        case "==": return left == right;
        case "!=": return left != right;
        case "<": return left < right;
        case "<=": return left <= right;
        case ">": return left > right;
        case ">=": return left >= right;
        default: throw new Error(`${context}: unsupported binary expression ${node.operator}`);
      }
    }
    case "LogicalExpression": {
      const left = evaluateStaticExpression(node.left, context, bindings, options);
      if (node.operator === "&&") {
        return left ? evaluateStaticExpression(node.right, context, bindings, options) : left;
      }
      if (node.operator === "||") {
        return left ? left : evaluateStaticExpression(node.right, context, bindings, options);
      }
      if (node.operator === "??") {
        return left == null ? evaluateStaticExpression(node.right, context, bindings, options) : left;
      }
      throw new Error(`${context}: unsupported logical expression ${node.operator}`);
    }
    case "ConditionalExpression":
      return evaluateStaticExpression(node.test, context, bindings, options)
        ? evaluateStaticExpression(node.consequent, context, bindings, options)
        : evaluateStaticExpression(node.alternate, context, bindings, options);
    case "MemberExpression": {
      const object = evaluateStaticExpression(node.object, context, bindings, options) as any;
      const key = node.computed
        ? evaluateStaticExpression(node.property, context, bindings, options)
        : node.property.name;
      if (object == null || (typeof object !== "object" && typeof object !== "string")) {
        throw new Error(`${context}: cannot read property ${String(key)} from a primitive`);
      }
      return asJson(object[key as any], context);
    }
    case "CallExpression": {
      if (node.callee?.type !== "MemberExpression") {
        throw new Error(`${context}: unsupported call target ${node.callee?.type ?? "unknown"}`);
      }
      const method = node.callee.computed
        ? evaluateStaticExpression(node.callee.property, context, bindings, options)
        : node.callee.property.name;
      const target = evaluateStaticExpression(node.callee.object, context, bindings, options);
      if (method === "map" && Array.isArray(target)) {
        const callback = node.arguments[0];
        return target.map((item, index) =>
          evaluateArrowFunction(callback, [item, index, target], `${context}.map[${index}]`, bindings, options),
        );
      }
      if (method === "startsWith" && typeof target === "string") {
        const prefix = evaluateStaticExpression(node.arguments[0], context, bindings, options);
        if (typeof prefix !== "string") throw new Error(`${context}: startsWith prefix must be a string`);
        return target.startsWith(prefix);
      }
      throw new Error(`${context}: unsupported static call ${String(method)}`);
    }
    case "TemplateLiteral": {
      let out = "";
      for (let i = 0; i < node.quasis.length; i++) {
        out += node.quasis[i].value.cooked ?? node.quasis[i].value.raw;
        if (node.expressions[i]) {
          const value = evaluateStaticExpression(node.expressions[i], context, bindings, options);
          if (value != null && typeof value === "object") {
            throw new Error(`${context}: template interpolation must resolve to a primitive`);
          }
          out += String(value ?? "");
        }
      }
      return out;
    }
    case "SequenceExpression": {
      if (node.expressions.length === 0) return null;
      return evaluateStaticExpression(node.expressions.at(-1), context, bindings, options);
    }
    case "JSXElement":
    case "JSXFragment":
      if (!options.jsx) throw new Error(`${context}: unsupported expression ${node.type}`);
      return options.jsx(node, context, bindings);
    default:
      throw new Error(`${context}: unsupported expression ${node?.type ?? "unknown"}`);
  }
}

function expressionFromData(
  data: Record<string, any> | undefined,
  context: string,
  bindings: StaticBindings,
): JsonValue {
  const body = data?.estree?.body;
  if (Array.isArray(body) && body.length === 0) return null;
  if (!Array.isArray(body) || body.length !== 1 || body[0]?.type !== "ExpressionStatement") {
    throw new Error(`${context}: expected one static expression`);
  }
  return evaluateStaticExpression(body[0].expression, context, bindings, { jsx: jsxExpressionToJson });
}

function jsxName(node: EstreeNode, context: string): string {
  if (node.type === "JSXIdentifier") return node.name;
  if (node.type === "JSXMemberExpression") {
    return `${jsxName(node.object, context)}.${jsxName(node.property, context)}`;
  }
  throw new Error(`${context}: unsupported JSX name ${node.type}`);
}

function jsxExpressionToJson(
  node: EstreeNode,
  context: string,
  bindings: StaticBindings,
): JsonValue {
  if (node.type === "JSXFragment") {
    return {
      type: "fragment",
      children: jsxEstreeChildren(node.children ?? [], `${context}.fragment`, bindings),
    };
  }

  const name = jsxName(node.openingElement.name, context);
  const props: Record<string, JsonValue> = {};
  for (const attr of node.openingElement.attributes ?? []) {
    if (attr.type === "JSXSpreadAttribute") {
      const spread = evaluateStaticExpression(attr.argument, `${context}<${name}> spread`, bindings, { jsx: jsxExpressionToJson });
      if (!spread || Array.isArray(spread) || typeof spread !== "object") {
        throw new Error(`${context}<${name}>: JSX spread must resolve to an object`);
      }
      Object.assign(props, spread);
      continue;
    }
    if (attr.type !== "JSXAttribute") {
      throw new Error(`${context}<${name}>: unsupported JSX attribute ${attr.type}`);
    }
    const key = jsxName(attr.name, context);
    if (attr.value == null) props[key] = true;
    else if (attr.value.type === "Literal") props[key] = asJson(attr.value.value, `${context}<${name}>.${key}`);
    else if (attr.value.type === "JSXExpressionContainer") {
      props[key] = attr.value.expression?.type === "JSXEmptyExpression"
        ? null
        : evaluateStaticExpression(attr.value.expression, `${context}<${name}>.${key}`, bindings, { jsx: jsxExpressionToJson });
    } else {
      throw new Error(`${context}<${name}>.${key}: unsupported JSX value ${attr.value.type}`);
    }
  }

  const children = jsxEstreeChildren(node.children ?? [], `${context}<${name}>`, bindings);
  const out: Record<string, JsonValue> = { type: "element", name };
  if (Object.keys(props).length) out.props = props;
  if (children.length) out.children = children;
  return out;
}

function jsxEstreeChildren(
  nodes: EstreeNode[],
  context: string,
  bindings: StaticBindings,
): JsonValue[] {
  const out: JsonValue[] = [];
  const append = (value: JsonValue): void => {
    if (value == null || value === false) return;
    if (Array.isArray(value)) {
      for (const item of value) append(item);
      return;
    }
    if (typeof value === "object") out.push(value);
    else out.push({ type: "text", value: String(value) });
  };
  for (const node of nodes) {
    if (node.type === "JSXText") {
      if (node.value) out.push({ type: "text", value: node.value });
      continue;
    }
    if (node.type === "JSXExpressionContainer") {
      if (node.expression?.type === "JSXEmptyExpression") continue;
      const value = evaluateStaticExpression(node.expression, context, bindings, { jsx: jsxExpressionToJson });
      append(value);
      continue;
    }
    if (node.type === "JSXElement" || node.type === "JSXFragment") {
      out.push(jsxExpressionToJson(node, context, bindings));
      continue;
    }
    throw new Error(`${context}: unsupported JSX child ${node.type}`);
  }
  return out;
}

function collectImports(tree: Root): Record<string, LessonComponentRef> {
  const refs: Record<string, LessonComponentRef> = {};
  for (const node of tree.children as MdNode[]) {
    if (node.type !== "mdxjsEsm") continue;
    const source = String(node.value ?? "");
    const program = parseModule(source, { ecmaVersion: "latest", sourceType: "module" }) as any;
    for (const statement of program.body) {
      if (statement.type !== "ImportDeclaration") {
        throw new Error(`lesson render tree: executable ESM is unsupported (${statement.type})`);
      }
      for (const specifier of statement.specifiers) {
        const exported = specifier.type === "ImportSpecifier"
          ? String(specifier.imported.name ?? specifier.imported.value)
          : specifier.type === "ImportNamespaceSpecifier"
            ? "*"
            : "default";
        refs[specifier.local.name] = { source: statement.source.value, export: exported };
      }
    }
  }
  return refs;
}

async function resolveStaticImports(
  imports: Record<string, LessonComponentRef>,
  sourcePath: string,
): Promise<{ bindings: Record<string, JsonValue>; dependencies: Record<string, string> }> {
  const bindings: Record<string, JsonValue> = {};
  const dependencies: Record<string, string> = {};
  for (const [localName, ref] of Object.entries(imports)) {
    if (!ref.source.endsWith(".svg?raw")) continue;
    const importPath = ref.source.slice(0, -"?raw".length);
    if (!importPath.startsWith(".")) {
      throw new Error(`${sourcePath}: raw SVG import must be relative (${ref.source})`);
    }
    const raw = await readFile(resolve(dirname(sourcePath), importPath), "utf8");
    bindings[localName] = raw;
    dependencies[ref.source] = sha256(raw);
  }
  return { bindings, dependencies };
}

function jsxProps(
  node: MdNode,
  context: string,
  bindings: StaticBindings,
): Record<string, JsonValue> {
  const props: Record<string, JsonValue> = {};
  for (const attr of node.attributes ?? []) {
    if (attr.type === "mdxJsxExpressionAttribute") {
      const spread = expressionFromData(attr.data, `${context} spread`, bindings);
      if (!spread || Array.isArray(spread) || typeof spread !== "object") {
        throw new Error(`${context}: JSX spread must resolve to an object`);
      }
      Object.assign(props, spread);
      continue;
    }
    if (attr.type !== "mdxJsxAttribute") {
      throw new Error(`${context}: unsupported JSX attribute ${attr.type}`);
    }
    if (attr.value == null) props[attr.name] = true;
    else if (typeof attr.value === "string") props[attr.name] = attr.value;
    else props[attr.name] = expressionFromData(attr.value.data, `${context}.${attr.name}`, bindings);
  }
  return props;
}

function element(name: string, props: Record<string, JsonValue> = {}, children: LessonRenderNode[] = []): LessonRenderNode {
  const out: Extract<LessonRenderNode, { type: "element" }> = { type: "element", name };
  if (Object.keys(props).length) out.props = props;
  if (children.length) out.children = children;
  return out;
}

function renderValueToNodes(value: JsonValue, context: string): LessonRenderNode[] {
  if (value == null || value === false) return [];
  if (typeof value === "string" || typeof value === "number" || value === true) {
    return [{ type: "text", value: String(value) }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => renderValueToNodes(item, `${context}[${index}]`));
  }
  if (value.type === "fragment" && Array.isArray(value.children)) {
    return renderValueToNodes(value.children, `${context}.children`);
  }
  if (value.type === "text" && typeof value.value === "string") {
    return [{ type: "text", value: value.value }];
  }
  if (value.type === "raw" && typeof value.value === "string") {
    return [{ type: "raw", value: value.value }];
  }
  if (value.type === "element" && typeof value.name === "string") {
    const props = value.props && !Array.isArray(value.props) && typeof value.props === "object"
      ? value.props as Record<string, JsonValue>
      : {};
    const children = Array.isArray(value.children)
      ? renderValueToNodes(value.children, `${context}.children`)
      : [];
    return [element(value.name, props, children)];
  }
  throw new Error(`${context}: non-render object child expression is unsupported`);
}

function convertChildren(
  nodes: MdNode[],
  context: string,
  bindings: StaticBindings,
): LessonRenderNode[] {
  return nodes.flatMap((node, index) => convertNode(node, `${context}[${index}]`, bindings));
}

function convertNode(node: MdNode, context: string, bindings: StaticBindings): LessonRenderNode[] {
  const children = () => convertChildren(node.children ?? [], `${context}.children`, bindings);
  switch (node.type) {
    case "mdxjsEsm":
    case "definition":
      return [];
    case "text":
      return [{ type: "text", value: node.value }];
    case "html":
      return [{ type: "raw", value: node.value }];
    case "paragraph":
      return [element("p", {}, children())];
    case "heading":
      return [element(`h${node.depth}`, {}, children())];
    case "emphasis":
      return [element("em", {}, children())];
    case "strong":
      return [element("strong", {}, children())];
    case "delete":
      return [element("del", {}, children())];
    case "inlineCode":
      return [element("code", {}, [{ type: "text", value: node.value }])];
    case "code": {
      const props: Record<string, JsonValue> = {};
      if (node.lang) props.class = `language-${node.lang}`;
      if (node.meta) props["data-meta"] = node.meta;
      return [element("pre", {}, [element("code", props, [{ type: "text", value: node.value }])])];
    }
    case "blockquote":
      return [element("blockquote", {}, children())];
    case "thematicBreak":
      return [element("hr")];
    case "break":
      return [element("br")];
    case "link": {
      const props: Record<string, JsonValue> = { href: node.url };
      if (node.title) props.title = node.title;
      return [element("a", props, children())];
    }
    case "image": {
      const props: Record<string, JsonValue> = { src: node.url, alt: node.alt ?? "" };
      if (node.title) props.title = node.title;
      return [element("img", props)];
    }
    case "list": {
      const props: Record<string, JsonValue> = {};
      if (node.ordered && typeof node.start === "number" && node.start !== 1) props.start = node.start;
      return [element(node.ordered ? "ol" : "ul", props, children())];
    }
    case "listItem": {
      const props: Record<string, JsonValue> = {};
      if (typeof node.checked === "boolean") props["data-checked"] = node.checked;
      return [element("li", props, children())];
    }
    case "table":
      return [element("table", {}, children())];
    case "tableRow":
      return [element("tr", {}, children())];
    case "tableCell":
      return [element("td", {}, children())];
    case "mdxJsxFlowElement":
    case "mdxJsxTextElement": {
      const props = jsxProps(node, `${context}<${node.name ?? "fragment"}>`, bindings);
      return node.name ? [element(node.name, props, children())] : children();
    }
    case "mdxFlowExpression":
    case "mdxTextExpression": {
      const value = expressionFromData(node.data, context, bindings);
      return renderValueToNodes(value, context);
    }
    default:
      throw new Error(`${context}: unsupported MDX node ${node.type}`);
  }
}

function usedComponents(
  nodes: LessonRenderNode[],
  imports: Record<string, LessonComponentRef>,
): Record<string, LessonComponentRef> {
  const out: Record<string, LessonComponentRef> = {};
  const visit = (items: LessonRenderNode[]): void => {
    for (const node of items) {
      if (node.type !== "element") continue;
      if (imports[node.name]) out[node.name] = imports[node.name];
      if (node.children) visit(node.children);
    }
  };
  visit(nodes);
  return out;
}

function injectRetrievalLessonKey(
  nodes: LessonRenderNode[],
  lessonKey: string,
): void {
  for (const node of nodes) {
    if (node.type !== "element") continue;
    if (node.name === "RetrievalDrawer") {
      node.props ??= {};
      node.props.lessonKey ??= lessonKey;
    }
    if (node.children) injectRetrievalLessonKey(node.children, lessonKey);
  }
}

export async function compileLessonRenderTree(
  raw: string,
  sourcePath: string,
  compilerFingerprint?: string,
): Promise<LessonRenderTreeArtifact> {
  const { data, body } = parseFrontmatter(raw);
  const identity = [data.track, data.unit, data.slug];
  if (!identity.every((part) => typeof part === "string" && part)) {
    throw new Error(`${sourcePath}: lesson render tree requires track/unit/slug frontmatter`);
  }

  const parsed = processor.parse(body) as Root;
  const tree = await processor.run(parsed) as Root;
  const imports = collectImports(tree);
  const { bindings, dependencies } = await resolveStaticImports(imports, sourcePath);
  const root = convertChildren(tree.children as MdNode[], sourcePath, bindings);
  const components = usedComponents(root, imports);
  injectRetrievalLessonKey(root, `${data.track}/${data.unit}/${data.slug}`);
  const sourceHash = sha256(raw);
  const compilerHash = compilerFingerprint ?? await renderTreeCompilerHash();
  const artifactHash = sha256(JSON.stringify({
    format: LESSON_RENDER_TREE_FORMAT,
    sourceHash,
    compilerHash,
    dependencies,
    components,
    root,
  }));
  return {
    format: LESSON_RENDER_TREE_FORMAT,
    sourceHash,
    compilerHash,
    artifactHash,
    dependencies,
    components,
    root,
  };
}
