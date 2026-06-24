// Thompson NFA construction + set-of-states simulation.
// Linear time: O(m * n) where m = NFA states, n = input length.
// No recursive backtracking — immune to catastrophic backtracking by construction.

// ─── AST ────────────────────────────────────────────────────────────────────

type ASTNode =
  | { kind: "lit"; ch: string }
  | { kind: "any" }
  | { kind: "concat"; left: ASTNode; right: ASTNode }
  | { kind: "alter"; left: ASTNode; right: ASTNode }
  | { kind: "star"; child: ASTNode }
  | { kind: "plus"; child: ASTNode }
  | { kind: "opt"; child: ASTNode };

// ─── Parser (recursive descent) ──────────────────────────────────────────────

function parse(pattern: string): ASTNode {
  let pos = 0;

  function parseAlternation(): ASTNode {
    let node = parseConcatenation();
    while (pos < pattern.length && pattern[pos] === "|") {
      pos++;
      node = { kind: "alter", left: node, right: parseConcatenation() };
    }
    return node;
  }

  function parseConcatenation(): ASTNode {
    let node = parseQuantifier();
    while (pos < pattern.length && pattern[pos] !== ")" && pattern[pos] !== "|") {
      node = { kind: "concat", left: node, right: parseQuantifier() };
    }
    return node;
  }

  function parseQuantifier(): ASTNode {
    let node = parseAtom();
    while (pos < pattern.length && (pattern[pos] === "*" || pattern[pos] === "+" || pattern[pos] === "?")) {
      const op = pattern[pos++];
      if (op === "*") node = { kind: "star", child: node };
      else if (op === "+") node = { kind: "plus", child: node };
      else node = { kind: "opt", child: node };
    }
    return node;
  }

  function parseAtom(): ASTNode {
    if (pos >= pattern.length) throw new Error("Unexpected end of pattern");
    const ch = pattern[pos];
    if (ch === "(") {
      pos++; // consume '('
      const node = parseAlternation();
      if (pos >= pattern.length || pattern[pos] !== ")") throw new Error("Unmatched '('");
      pos++; // consume ')'
      return node;
    }
    if (ch === ".") { pos++; return { kind: "any" }; }
    if (ch === ")" || ch === "|" || ch === "*" || ch === "+" || ch === "?") {
      throw new Error(`Unexpected character '${ch}' at position ${pos}`);
    }
    pos++;
    return { kind: "lit", ch };
  }

  const ast = parseAlternation();
  if (pos < pattern.length) throw new Error(`Unexpected character '${pattern[pos]}' at position ${pos}`);
  return ast;
}

// ─── NFA ─────────────────────────────────────────────────────────────────────

// A transition is either a character transition or an epsilon transition (null label).
interface Transition {
  label: string | null; // null = epsilon; "." = any char
  to: number;
}

export interface NFA {
  // transitions[stateId] = list of outgoing transitions
  transitions: Transition[][];
  start: number;
  accept: number;
}

// A fragment has a start state and an accept state.
// States are global integers; `transitions` is the shared array passed by reference.
interface Fragment {
  start: number;
  accept: number;
}

function buildNFA(ast: ASTNode): NFA {
  const transitions: Transition[][] = [];
  let nextId = 0;

  function newState(): number {
    const id = nextId++;
    transitions.push([]);
    return id;
  }

  function addEps(from: number, to: number): void {
    transitions[from].push({ label: null, to });
  }

  function addChar(from: number, label: string | null, to: number): void {
    transitions[from].push({ label, to });
  }

  function build(node: ASTNode): Fragment {
    switch (node.kind) {
      case "lit": {
        const s = newState(), a = newState();
        addChar(s, node.ch, a);
        return { start: s, accept: a };
      }
      case "any": {
        const s = newState(), a = newState();
        addChar(s, ".", a); // "." label = any character
        return { start: s, accept: a };
      }
      case "concat": {
        const l = build(node.left);
        const r = build(node.right);
        addEps(l.accept, r.start);
        return { start: l.start, accept: r.accept };
      }
      case "alter": {
        const s = newState(), a = newState();
        const l = build(node.left);
        const r = build(node.right);
        addEps(s, l.start);
        addEps(s, r.start);
        addEps(l.accept, a);
        addEps(r.accept, a);
        return { start: s, accept: a };
      }
      case "star": {
        const s = newState(), a = newState();
        const child = build(node.child);
        addEps(s, child.start); // enter child
        addEps(s, a);           // skip child entirely (zero repetitions)
        addEps(child.accept, child.start); // loop back
        addEps(child.accept, a);           // exit loop
        return { start: s, accept: a };
      }
      case "plus": {
        // Plus(A) = Concat(A, Star(A)) — reuse the child's states via Star wrapper
        const child = build(node.child);
        const star = build({ kind: "star", child: node.child });
        addEps(child.accept, star.start);
        return { start: child.start, accept: star.accept };
      }
      case "opt": {
        const s = newState(), a = newState();
        const child = build(node.child);
        addEps(s, child.start); // take child
        addEps(s, a);           // skip child
        addEps(child.accept, a);
        return { start: s, accept: a };
      }
    }
  }

  const frag = build(ast);
  return { transitions, start: frag.start, accept: frag.accept };
}

// ─── Simulation (set-of-states) ───────────────────────────────────────────────

// Compute the epsilon-closure of a set of states.
// Uses BFS; each state is enqueued at most once (deduplication via visited set).
function epsilonClosure(nfa: NFA, states: Set<number>): Set<number> {
  const closure = new Set<number>(states);
  const queue = Array.from(states);
  let i = 0;
  while (i < queue.length) {
    const s = queue[i++];
    for (const t of nfa.transitions[s]) {
      if (t.label === null && !closure.has(t.to)) {
        // Key guard: skip states already in the closure.
        // This cap on set size (bounded by total NFA states m) is what makes
        // the simulation O(m·n) rather than exponential — no state is ever
        // re-processed on the same character step.
        closure.add(t.to);
        queue.push(t.to);
      }
    }
  }
  return closure;
}

export function compile(pattern: string): NFA {
  const ast = parse(pattern);
  return buildNFA(ast);
}

export function match(nfa: NFA, input: string): boolean {
  // Start: epsilon-closure of the start state.
  let current = epsilonClosure(nfa, new Set([nfa.start]));

  for (const ch of input) {
    // Advance: collect all states reachable by a character transition.
    const next = new Set<number>();
    for (const s of current) {
      for (const t of nfa.transitions[s]) {
        if (t.label !== null && (t.label === "." || t.label === ch)) {
          next.add(t.to);
        }
      }
    }
    // Recompute epsilon-closure after the character step.
    current = epsilonClosure(nfa, next);
    // Early exit: if the set is empty, no path can lead to acceptance.
    if (current.size === 0) return false;
  }

  // Full-string match: accept only if the accept state is in the final set.
  return current.has(nfa.accept);
}
