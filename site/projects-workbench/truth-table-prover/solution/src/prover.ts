// Reference solution: recursive-descent parser for propositional logic.
// Operators (high→low precedence): ! > & > | > -> > <->
// Variables: single lowercase letters a–z. Parentheses allowed.

// ── AST node types ──────────────────────────────────────────────────────────

type Var   = { kind: "var"; name: string };
type Not   = { kind: "not"; arg: Ast };
type And   = { kind: "and"; left: Ast; right: Ast };
type Or    = { kind: "or";  left: Ast; right: Ast };
type Impl  = { kind: "->";  left: Ast; right: Ast };
type Iff   = { kind: "<->"; left: Ast; right: Ast };

export type Ast = Var | Not | And | Or | Impl | Iff;

// ── Tokenizer ────────────────────────────────────────────────────────────────

type Token =
  | { type: "var"; name: string }
  | { type: "!" }
  | { type: "&" }
  | { type: "|" }
  | { type: "->" }
  | { type: "<->" }
  | { type: "(" }
  | { type: ")" }
  | { type: "EOF" };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === " " || ch === "\t") { i++; continue; }
    if (ch >= "a" && ch <= "z") { tokens.push({ type: "var", name: ch }); i++; continue; }
    if (ch === "!") { tokens.push({ type: "!" }); i++; continue; }
    if (ch === "&") { tokens.push({ type: "&" }); i++; continue; }
    if (ch === "|") { tokens.push({ type: "|" }); i++; continue; }
    if (ch === "(") { tokens.push({ type: "(" }); i++; continue; }
    if (ch === ")") { tokens.push({ type: ")" }); i++; continue; }
    if (expr.startsWith("<->", i)) { tokens.push({ type: "<->" }); i += 3; continue; }
    if (expr.startsWith("->", i))  { tokens.push({ type: "->" });  i += 2; continue; }
    throw new Error(`Unexpected character '${ch}' at position ${i}`);
  }
  tokens.push({ type: "EOF" });
  return tokens;
}

// ── Recursive-descent parser ─────────────────────────────────────────────────
// Grammar (low → high precedence):
//   iff  ::= impl ( '<->' impl )*
//   impl ::= or  ( '->'  impl  )?    (right-associative)
//   or   ::= and ( '|'   and  )*
//   and  ::= not ( '&'   not  )*
//   not  ::= '!' not | atom
//   atom ::= VAR | '(' iff ')'

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private consume(): Token { return this.tokens[this.pos++]; }

  private expect(type: string): Token {
    const t = this.consume();
    if (t.type !== type) throw new Error(`Expected '${type}', got '${t.type}'`);
    return t;
  }

  parseIff(): Ast {
    let left = this.parseImpl();
    while (this.peek().type === "<->") {
      this.consume();
      const right = this.parseImpl();
      left = { kind: "<->", left, right };
    }
    return left;
  }

  parseImpl(): Ast {
    const left = this.parseOr();
    if (this.peek().type === "->") {
      this.consume();
      const right = this.parseImpl(); // right-associative
      return { kind: "->", left, right };
    }
    return left;
  }

  parseOr(): Ast {
    let left = this.parseAnd();
    while (this.peek().type === "|") {
      this.consume();
      const right = this.parseAnd();
      left = { kind: "or", left, right };
    }
    return left;
  }

  parseAnd(): Ast {
    let left = this.parseNot();
    while (this.peek().type === "&") {
      this.consume();
      const right = this.parseNot();
      left = { kind: "and", left, right };
    }
    return left;
  }

  parseNot(): Ast {
    if (this.peek().type === "!") {
      this.consume();
      return { kind: "not", arg: this.parseNot() };
    }
    return this.parseAtom();
  }

  parseAtom(): Ast {
    const t = this.peek();
    if (t.type === "var") {
      this.consume();
      return { kind: "var", name: t.name };
    }
    if (t.type === "(") {
      this.consume();
      const inner = this.parseIff();
      this.expect(")");
      return inner;
    }
    if (t.type === "EOF") {
      throw new Error("Unexpected end of expression");
    }
    throw new Error(`Unexpected token '${t.type}'`);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function parse(expr: string): Ast {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens);
  const ast = parser.parseIff();
  // Must consume everything (only EOF remains)
  const remaining = tokens[parser["pos"]];
  if (remaining && remaining.type !== "EOF") {
    throw new Error(`Unexpected token '${remaining.type}' after end of expression`);
  }
  return ast;
}

export function evaluate(ast: Ast, env: Record<string, boolean>): boolean {
  switch (ast.kind) {
    case "var":  return env[ast.name] ?? false;
    case "not":  return !evaluate(ast.arg, env);
    case "and":  return evaluate(ast.left, env) && evaluate(ast.right, env);
    case "or":   return evaluate(ast.left, env) || evaluate(ast.right, env);
    case "->":   return !evaluate(ast.left, env) || evaluate(ast.right, env);
    case "<->":  return evaluate(ast.left, env) === evaluate(ast.right, env);
  }
}

// Collect all variable names from an AST in sorted order.
function vars(ast: Ast): string[] {
  const set = new Set<string>();
  function walk(node: Ast): void {
    if (node.kind === "var") { set.add(node.name); return; }
    if (node.kind === "not") { walk(node.arg); return; }
    walk(node.left);
    walk(node.right);
  }
  walk(ast);
  return [...set].sort();
}

// Enumerate all 2^n assignments for a given variable list.
function* assignments(variables: string[]): Generator<Record<string, boolean>> {
  const n = variables.length;
  for (let mask = 0; mask < (1 << n); mask++) {
    const env: Record<string, boolean> = {};
    for (let i = 0; i < n; i++) {
      env[variables[i]] = (mask & (1 << i)) !== 0;
    }
    yield env;
  }
}

export function classify(expr: string): "tautology" | "contradiction" | "contingent" {
  const ast = parse(expr);
  const variables = vars(ast);
  let anyTrue = false;
  let anyFalse = false;
  for (const env of assignments(variables)) {
    if (evaluate(ast, env)) { anyTrue = true; } else { anyFalse = true; }
    if (anyTrue && anyFalse) return "contingent";
  }
  if (anyTrue && !anyFalse) return "tautology";
  if (!anyTrue && anyFalse) return "contradiction";
  // Edge: zero variables (empty formula resolves to constant)
  return anyTrue ? "tautology" : "contradiction";
}

export function equivalent(a: string, b: string): boolean {
  const astA = parse(a);
  const astB = parse(b);
  const variables = [...new Set([...vars(astA), ...vars(astB)])].sort();
  for (const env of assignments(variables)) {
    if (evaluate(astA, env) !== evaluate(astB, env)) return false;
  }
  return true;
}
