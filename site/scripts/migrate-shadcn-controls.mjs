import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = new URL("../src/", import.meta.url);
const tagMap = new Map([
  ["button", ["ShadcnButton", 'import { Button as ShadcnButton } from "~/components/ui/button";']],
  ["input", ["ShadcnInput", 'import { Input as ShadcnInput } from "~/components/ui/input";']],
  ["textarea", ["ShadcnTextarea", 'import { Textarea as ShadcnTextarea } from "~/components/ui/textarea";']],
  ["select", ["ShadcnNativeSelect", 'import { NativeSelect as ShadcnNativeSelect } from "~/components/ui/native-select";']],
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) files.push(full);
  }
  return files;
}

for (const file of await walk(root.pathname)) {
  if (file.includes(`${path.sep}components${path.sep}ui${path.sep}`)) continue;

  const source = await readFile(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const imports = new Set();

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) {
      if (ts.isIdentifier(node.tagName)) {
        const entry = tagMap.get(node.tagName.text);
        if (entry) {
          const [replacement, importLine] = entry;
          edits.push([node.tagName.getStart(sf), node.tagName.getEnd(), replacement]);
          imports.add(importLine);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!edits.length) continue;
  let next = source;
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) {
    next = next.slice(0, start) + replacement + next.slice(end);
  }
  next = `${[...imports].join("\n")}\n${next}`;
  await writeFile(file, next);
}
