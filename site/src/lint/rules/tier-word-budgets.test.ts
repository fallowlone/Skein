import { describe, expect, test } from "vitest";
import { checkTierWordBudgets } from "./tier-word-budgets";

const wrap = (tier: "junior" | "middle" | "senior", words: number) => {
  const text = Array.from({ length: words }, () => "word").join(" ");
  return `<div data-tier-panel="${tier}">${text}</div>`;
};

describe("tier-word-budgets", () => {
  test("junior 200-500: 350 words passes", () => {
    expect(checkTierWordBudgets(wrap("junior", 350), "p.html")).toEqual([]);
  });
  test("junior < 200: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 100), "p.html");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/junior.*100.*below.*200/);
  });
  test("junior > 500: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 600), "p.html");
    expect(errs[0]).toMatch(/junior.*600.*above.*500/);
  });
  test("middle 2500-3500: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("middle", 3000), "p.html")).toEqual([]);
  });
  test("middle > 3500: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 4000), "p.html")[0]).toMatch(/middle.*4000.*above.*3500/);
  });
  test("middle < 2500: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 1000), "p.html")[0]).toMatch(/middle.*1000.*below.*2500/);
  });
  test("senior 2500-4000: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("senior", 3000), "p.html")).toEqual([]);
  });
  test("senior > 4000: flags", () => {
    expect(checkTierWordBudgets(wrap("senior", 5000), "p.html")[0]).toMatch(/senior.*5000.*above.*4000/);
  });
  test("HTML inside tier panel is stripped before counting", () => {
    const html = `<div data-tier-panel="junior"><p><strong>hello</strong> world ${"word ".repeat(298)}</p></div>`;
    expect(checkTierWordBudgets(html, "p.html")).toEqual([]);
  });
});
