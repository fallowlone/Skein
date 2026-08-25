export const HINT_COSTS = [6, 10, 14, 20] as const;

/** Interview mode doubles the mastery cost of every revealed hint. */
export function calcMastery(hintsOpen: number, interviewMode: boolean): number {
  const factor = interviewMode ? 2 : 1;
  let spent = 0;
  for (let i = 0; i < hintsOpen; i++) spent += HINT_COSTS[i] * factor;
  return Math.max(0, 100 - spent);
}

export type Token = { text: string; kind: "plain" | "com" | "str" | "num" | "kw" | "fn" };

const KEYWORDS = new Set([
  "function", "const", "let", "var", "return", "if", "else", "while", "for",
  "continue", "break", "new", "typeof", "of", "in",
]);

const TOKEN_RE =
  /(\/\/[^\n]*)|('[^']*'|"[^"]*")|(\b\d+\b)|\b(function|const|let|var|return|if|else|while|for|continue|break|new|typeof|of|in)\b|([A-Za-z_$][A-Za-z0-9_$]*)(?=\s*\()/g;

/** Splits one line of JS into highlight tokens. Deliberately simple (regex, not a parser) — good enough for a single-function editor, matches the design's own tokenizer. */
export function tokenize(line: string): Token[] {
  const out: Token[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(line)) !== null) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), kind: "plain" });
    const kind: Token["kind"] = m[1] ? "com" : m[2] ? "str" : m[3] ? "num" : m[4] ? "kw" : "fn";
    out.push({ text: m[0], kind });
    last = TOKEN_RE.lastIndex;
  }
  if (last < line.length) out.push({ text: line.slice(last), kind: "plain" });
  return out;
}

export function isKeyword(word: string): boolean {
  return KEYWORDS.has(word);
}

/** The identifier immediately left of the caret, for tab-completion. */
export function currentToken(code: string, caret: number): string {
  const before = code.slice(0, caret);
  const m = before.match(/[A-Za-z_$][A-Za-z0-9_$.]*$/);
  return m ? m[0] : "";
}
