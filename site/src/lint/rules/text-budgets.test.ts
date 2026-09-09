import { describe, expect, test } from "vitest";
import { checkTextBudgets } from "./text-budgets";

describe("text-budgets", () => {
  test("flags Crux > 180 chars", () => {
    const html = `<aside data-text-class="crux">${"x".repeat(181)}</aside>`;
    const errs = checkTextBudgets(html, "stub-piece.html");
    expect(errs.length).toBe(1);
    expect(errs[0]).toMatch(/crux/);
  });
  test("passes Crux ≤ 180 chars", () => {
    const html = `<aside data-text-class="crux">${"x".repeat(180)}</aside>`;
    expect(checkTextBudgets(html, "p.html")).toEqual([]);
  });
});
