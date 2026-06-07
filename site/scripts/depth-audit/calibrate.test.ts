import { describe, it, expect } from "vitest";
import { calibrateBar } from "./calibrate";

describe("calibrateBar", () => {
  it("finds a separating threshold between good and thin clusters", () => {
    const r = calibrateBar([
      { unitKey: "a", label: "good", overall: 4.2 },
      { unitKey: "b", label: "good", overall: 3.8 },
      { unitKey: "c", label: "thin", overall: 1.5 },
      { unitKey: "d", label: "thin", overall: 2.1 },
    ]);
    expect(r.bar).toBeGreaterThan(2.1);
    expect(r.bar).toBeLessThanOrEqual(3.8);
    expect(r.f1).toBe(1);
    expect(r.misclassified).toHaveLength(0);
  });
  it("reports misclassified units when clusters overlap", () => {
    const r = calibrateBar([
      { unitKey: "a", label: "good", overall: 2.0 },
      { unitKey: "b", label: "thin", overall: 3.0 },
    ]);
    expect(r.f1).toBeLessThan(1);
    expect(r.misclassified.length).toBeGreaterThan(0);
  });
  it("throws when the labeled set lacks one class", () => {
    expect(() => calibrateBar([
      { unitKey: "a", label: "thin", overall: 1.0 },
      { unitKey: "b", label: "thin", overall: 2.0 },
    ])).toThrow(/both/);
  });
});
