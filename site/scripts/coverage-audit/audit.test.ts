import { describe, it, expect } from "vitest";
import { gateExitCode, renderReport } from "./audit";
import type { GrammarCoverage } from "~/english/grammar-coverage";

const clean: GrammarCoverage = {
  bands: [{ cefr: "A1", total: 2, covered: 2, waived: 0, missing: [], pct: 100 }],
  overallPct: 100, missingTotal: 0,
};
const gappy: GrammarCoverage = {
  bands: [{ cefr: "A1", total: 2, covered: 1, waived: 0, missing: ["egp.a1.x.y"], pct: 50 }],
  overallPct: 50, missingTotal: 1,
};

describe("audit gate", () => {
  it("exit 0 when nothing missing", () => { expect(gateExitCode(clean)).toBe(0); });
  it("exit 1 when something missing", () => { expect(gateExitCode(gappy)).toBe(1); });
});
describe("renderReport", () => {
  it("includes overall pct and a per-band line", () => {
    const r = renderReport(gappy);
    expect(r).toContain("50%");
    expect(r).toContain("A1");
    expect(r).toContain("egp.a1.x.y");
  });
});
