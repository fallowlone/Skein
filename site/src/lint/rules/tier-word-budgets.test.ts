import { describe, expect, test } from "vitest";
import { checkTierWordBudgets } from "./tier-word-budgets";

const wrap = (tier: "junior" | "middle" | "senior", words: number) => {
  const text = Array.from({ length: words }, () => "word").join(" ");
  return `<div data-tier-panel="${tier}">${text}</div><!--/tier-panel-->`;
};

describe("tier-word-budgets", () => {
  test("junior 200-800: 350 words passes", () => {
    expect(checkTierWordBudgets(wrap("junior", 350), "p.html")).toEqual([]);
  });
  test("junior < 200: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 100), "p.html");
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/junior.*100.*below.*200/);
  });
  test("junior > 800: flags", () => {
    const errs = checkTierWordBudgets(wrap("junior", 900), "p.html");
    expect(errs[0]).toMatch(/junior.*900.*above.*800/);
  });
  test("middle 2490-3720: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("middle", 3000), "p.html")).toEqual([]);
  });
  test("middle > 3720: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 4000), "p.html")[0]).toMatch(/middle.*4000.*above.*3720/);
  });
  test("middle < 2490: flags", () => {
    expect(checkTierWordBudgets(wrap("middle", 1000), "p.html")[0]).toMatch(/middle.*1000.*below.*2490/);
  });
  test("senior 2490-4020: 3000 passes", () => {
    expect(checkTierWordBudgets(wrap("senior", 3000), "p.html")).toEqual([]);
  });
  test("senior > 4020: flags", () => {
    expect(checkTierWordBudgets(wrap("senior", 5000), "p.html")[0]).toMatch(/senior.*5000.*above.*4020/);
  });
  test("HTML inside tier panel is stripped before counting", () => {
    const html = `<div data-tier-panel="junior"><p><strong>hello</strong> world ${"word ".repeat(298)}</p></div><!--/tier-panel-->`;
    expect(checkTierWordBudgets(html, "p.html")).toEqual([]);
  });
});
