export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [k: string]: JsonValue };

export class ParseError extends Error {
  constructor(message: string, public readonly position: number) {
    super(message);
    this.name = "ParseError";
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Token types (const enum compiles away to literals)
// ──────────────────────────────────────────────────────────────────────────────

const enum TK {
  LEFT_BRACE,
  RIGHT_BRACE,
  LEFT_BRACKET,
  RIGHT_BRACKET,
  COLON,
  COMMA,
  STRING,
  NUMBER,
  TRUE,
  FALSE,
  NULL,
  EOF,
}

interface Token {
  type: TK;
  pos: number;
  raw: string; // content without delimiters, only meaningful for STRING and NUMBER
}

// ──────────────────────────────────────────────────────────────────────────────
// Tokenizer
// ──────────────────────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    // whitespace
    if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") { i++; continue; }

    const pos = i;

    switch (ch) {
      case "{": tokens.push({ type: TK.LEFT_BRACE,   pos, raw: "" }); i++; continue;
      case "}": tokens.push({ type: TK.RIGHT_BRACE,  pos, raw: "" }); i++; continue;
      case "[": tokens.push({ type: TK.LEFT_BRACKET, pos, raw: "" }); i++; continue;
      case "]": tokens.push({ type: TK.RIGHT_BRACKET,pos, raw: "" }); i++; continue;
      case ":": tokens.push({ type: TK.COLON,        pos, raw: "" }); i++; continue;
      case ",": tokens.push({ type: TK.COMMA,        pos, raw: "" }); i++; continue;
    }

    if (ch === "t") {
      if (input.slice(i, i + 4) === "true")  { tokens.push({ type: TK.TRUE,  pos, raw: "" }); i += 4; continue; }
      throw new ParseError("Expected 'true'", pos);
    }
    if (ch === "f") {
      if (input.slice(i, i + 5) === "false") { tokens.push({ type: TK.FALSE, pos, raw: "" }); i += 5; continue; }
      throw new ParseError("Expected 'false'", pos);
    }
    if (ch === "n") {
      if (input.slice(i, i + 4) === "null")  { tokens.push({ type: TK.NULL,  pos, raw: "" }); i += 4; continue; }
      throw new ParseError("Expected 'null'", pos);
    }

    if (ch === '"') {
      const start = pos;
      let j = i + 1;
      while (j < input.length) {
        if (input[j] === "\\") { j += 2; }
        else if (input[j] === '"') { break; }
        else { j++; }
      }
      if (j >= input.length) throw new ParseError("Unterminated string", start);
      tokens.push({ type: TK.STRING, pos, raw: input.slice(i + 1, j) });
      i = j + 1;
      continue;
    }

    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let j = i;
      if (input[j] === "-") j++;
      while (j < input.length && input[j] >= "0" && input[j] <= "9") j++;
      if (j < input.length && input[j] === ".") {
        j++;
        while (j < input.length && input[j] >= "0" && input[j] <= "9") j++;
      }
      if (j < input.length && (input[j] === "e" || input[j] === "E")) {
        j++;
        if (j < input.length && (input[j] === "+" || input[j] === "-")) j++;
        while (j < input.length && input[j] >= "0" && input[j] <= "9") j++;
      }
      tokens.push({ type: TK.NUMBER, pos, raw: input.slice(i, j) });
      i = j;
      continue;
    }

    throw new ParseError(`Unexpected character '${ch}'`, pos);
  }

  tokens.push({ type: TK.EOF, pos: input.length, raw: "" });
  return tokens;
}

// ──────────────────────────────────────────────────────────────────────────────
// String decoder
// ──────────────────────────────────────────────────────────────────────────────

function decodeString(raw: string, basePos: number): string {
  // basePos = position of the character after the opening quote in the source
  let result = "";
  let i = 0;
  while (i < raw.length) {
    if (raw[i] !== "\\") { result += raw[i++]; continue; }
    if (i + 1 >= raw.length) throw new ParseError("Incomplete escape", basePos + i);
    const esc = raw[i + 1];
    switch (esc) {
      case '"':  result += '"';  i += 2; break;
      case "\\": result += "\\"; i += 2; break;
      case "/":  result += "/";  i += 2; break;
      case "b":  result += "\b"; i += 2; break;
      case "f":  result += "\f"; i += 2; break;
      case "n":  result += "\n"; i += 2; break;
      case "r":  result += "\r"; i += 2; break;
      case "t":  result += "\t"; i += 2; break;
      case "u": {
        if (i + 5 > raw.length) throw new ParseError("Incomplete \\uXXXX", basePos + i);
        const hex = raw.slice(i + 2, i + 6);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new ParseError("Invalid \\uXXXX", basePos + i);
        const code = parseInt(hex, 16);
        i += 6;
        if (code >= 0xd800 && code <= 0xdbff) {
          // high surrogate — must be followed by low surrogate
          if (i + 5 <= raw.length && raw[i] === "\\" && raw[i + 1] === "u") {
            const hex2 = raw.slice(i + 2, i + 6);
            if (/^[0-9a-fA-F]{4}$/.test(hex2)) {
              const code2 = parseInt(hex2, 16);
              if (code2 >= 0xdc00 && code2 <= 0xdfff) {
                result += String.fromCodePoint(0x10000 + ((code - 0xd800) << 10) + (code2 - 0xdc00));
                i += 6;
                break;
              }
            }
          }
          throw new ParseError("Lone high surrogate", basePos + i - 6);
        } else if (code >= 0xdc00 && code <= 0xdfff) {
          throw new ParseError("Lone low surrogate", basePos + i - 6);
        } else {
          result += String.fromCodePoint(code);
        }
        break;
      }
      default:
        throw new ParseError(`Unknown escape '\\${esc}'`, basePos + i);
    }
  }
  return result;
}

// ──────────────────────────────────────────────────────────────────────────────
// Number decoder
// ──────────────────────────────────────────────────────────────────────────────

const NUMBER_RE = /^-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?$/;

function decodeNumber(raw: string, pos: number): number {
  if (!NUMBER_RE.test(raw)) throw new ParseError(`Invalid number '${raw}'`, pos);
  return Number(raw);
}

// ──────────────────────────────────────────────────────────────────────────────
// Recursive-descent parser
// ──────────────────────────────────────────────────────────────────────────────

const MAX_DEPTH = 500;

class _Parser {
  idx = 0;
  constructor(private readonly tokens: Token[]) {}

  peek(): Token { return this.tokens[this.idx]; }

  consume(expected?: TK): Token {
    const tok = this.tokens[this.idx];
    if (expected !== undefined && tok.type !== expected) {
      throw new ParseError(`Unexpected token`, tok.pos);
    }
    this.idx++;
    return tok;
  }

  parseValue(depth: number): JsonValue {
    if (depth > MAX_DEPTH) throw new ParseError("Nesting too deep", this.peek().pos);
    const tok = this.peek();
    switch (tok.type) {
      case TK.LEFT_BRACE:    return this.parseObject(depth);
      case TK.LEFT_BRACKET:  return this.parseArray(depth);
      case TK.STRING: {
        this.consume();
        return decodeString(tok.raw, tok.pos + 1); // +1: skip opening quote in source
      }
      case TK.NUMBER: {
        this.consume();
        return decodeNumber(tok.raw, tok.pos);
      }
      case TK.TRUE:  this.consume(); return true;
      case TK.FALSE: this.consume(); return false;
      case TK.NULL:  this.consume(); return null;
      default: throw new ParseError("Unexpected token", tok.pos);
    }
  }

  private parseObject(depth: number): { [k: string]: JsonValue } {
    this.consume(TK.LEFT_BRACE);
    const obj: { [k: string]: JsonValue } = {};

    if (this.peek().type === TK.RIGHT_BRACE) { this.consume(); return obj; }

    while (true) {
      const keyTok = this.peek();
      if (keyTok.type !== TK.STRING) throw new ParseError("Object key must be a string", keyTok.pos);
      this.consume();
      const key = decodeString(keyTok.raw, keyTok.pos + 1);
      this.consume(TK.COLON);
      obj[key] = this.parseValue(depth + 1);

      const next = this.peek();
      if (next.type === TK.RIGHT_BRACE) { this.consume(); break; }
      if (next.type === TK.COMMA) {
        this.consume();
        // trailing comma: comma followed immediately by '}'
        if (this.peek().type === TK.RIGHT_BRACE) throw new ParseError("Trailing comma in object", next.pos);
        continue;
      }
      throw new ParseError("Expected ',' or '}' in object", next.pos);
    }
    return obj;
  }

  private parseArray(depth: number): JsonValue[] {
    this.consume(TK.LEFT_BRACKET);
    const arr: JsonValue[] = [];

    if (this.peek().type === TK.RIGHT_BRACKET) { this.consume(); return arr; }

    while (true) {
      arr.push(this.parseValue(depth + 1));

      const next = this.peek();
      if (next.type === TK.RIGHT_BRACKET) { this.consume(); break; }
      if (next.type === TK.COMMA) {
        this.consume();
        // trailing comma: comma followed immediately by ']'
        if (this.peek().type === TK.RIGHT_BRACKET) throw new ParseError("Trailing comma in array", next.pos);
        continue;
      }
      throw new ParseError("Expected ',' or ']' in array", next.pos);
    }
    return arr;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Public entry point
// ──────────────────────────────────────────────────────────────────────────────

export function parse(input: string): JsonValue {
  const tokens = tokenize(input);
  const p = new _Parser(tokens);
  const value = p.parseValue(0);
  const trailing = p.peek();
  if (trailing.type !== TK.EOF) {
    throw new ParseError("Unexpected trailing content", trailing.pos);
  }
  return value;
}
