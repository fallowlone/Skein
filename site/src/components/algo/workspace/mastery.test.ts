import { describe, expect, test } from "vitest";
import { calcMastery, currentToken, tokenize } from "./mastery";

describe("calcMastery", () => {
  test("full mastery with no hints spent", () => {
    expect(calcMastery(0, false)).toBe(100);
  });

  test("subtracts the cost of each revealed rung in order", () => {
    expect(calcMastery(1, false)).toBe(94);
    expect(calcMastery(2, false)).toBe(84);
    expect(calcMastery(3, false)).toBe(70);
    expect(calcMastery(4, false)).toBe(50);
  });

  test("interview mode doubles every rung's cost", () => {
    expect(calcMastery(1, true)).toBe(88);
    expect(calcMastery(2, true)).toBe(68);
  });

  test("never drops below zero", () => {
    expect(calcMastery(4, true)).toBe(0);
  });
});

describe("tokenize", () => {
  test("marks a keyword as kw", () => {
    const tokens = tokenize("  return out;");
    expect(tokens.some((t) => t.kind === "kw" && t.text === "return")).toBe(true);
  });

  test("marks a call target as fn", () => {
    const tokens = tokenize("nums.sort((a, b) => a - b);");
    expect(tokens.some((t) => t.kind === "fn" && t.text === "sort")).toBe(true);
  });

  test("marks a string literal as str", () => {
    const tokens = tokenize("const s = 'hi';");
    expect(tokens.some((t) => t.kind === "str" && t.text === "'hi'")).toBe(true);
  });

  test("marks a line comment as com and does not tokenize past it", () => {
    const tokens = tokenize("x++; // increment");
    const comment = tokens.find((t) => t.kind === "com");
    expect(comment?.text).toBe("// increment");
  });

  test("round-trips: concatenating token text reproduces the line", () => {
    const line = "  if (i > 0 && nums[i] === nums[i - 1]) continue;";
    const tokens = tokenize(line);
    expect(tokens.map((t) => t.text).join("")).toBe(line);
  });
});

describe("currentToken", () => {
  test("returns the identifier immediately left of the caret", () => {
    expect(currentToken("const nu", 8)).toBe("nu");
  });

  test("includes dotted member access", () => {
    expect(currentToken("Math.mi", 7)).toBe("Math.mi");
  });

  test("returns empty string after whitespace or punctuation", () => {
    expect(currentToken("nums. ", 6)).toBe("");
    expect(currentToken("nums[", 5)).toBe("");
  });
});
