import { describe, it, expect } from "vitest";
import { nextStatus, needsRevisit, type DrillStatus } from "./drill-state";

describe("drill-state", () => {
  it("cycles unattempted → attempted → solved → unattempted", () => {
    expect(nextStatus("unattempted")).toBe("attempted");
    expect(nextStatus("attempted")).toBe("solved");
    expect(nextStatus("solved")).toBe("unattempted");
  });
  it("flags a solved problem for revisit after 5+ days", () => {
    const now = 1_000 * 60 * 60 * 24 * 10;
    const day4 = now - 4 * 86_400_000;
    const day6 = now - 6 * 86_400_000;
    expect(needsRevisit({ status: "solved", at: day6 }, now)).toBe(true);
    expect(needsRevisit({ status: "solved", at: day4 }, now)).toBe(false);
  });
  it("never flags unattempted/attempted for revisit", () => {
    const now = 1_000_000_000_000;
    expect(needsRevisit({ status: "unattempted", at: 0 }, now)).toBe(false);
    expect(needsRevisit({ status: "attempted", at: 0 }, now)).toBe(false);
  });
});
