import { describe, it, expect } from "vitest";
import { tierEffort } from "./tier-effort";

describe("tierEffort", () => {
  it("middle is the canonical 1.0", () => {
    expect(tierEffort("middle")).toBe(1.0);
  });
  it("junior skims cheaper, senior deep-reads dearer; strictly monotonic", () => {
    expect(tierEffort("junior")).toBeLessThan(tierEffort("middle"));
    expect(tierEffort("senior")).toBeGreaterThan(tierEffort("middle"));
  });
  it("locks exact multipliers (regression guard — affects deadline budget)", () => {
    expect(tierEffort("junior")).toBe(0.65);
    expect(tierEffort("senior")).toBe(1.25);
  });
  it("falls back to 1.0 for an unknown tier token", () => {
    // @ts-expect-error — guarding the runtime fallback for a corrupt per-track map collapse
    expect(tierEffort("nonsense")).toBe(1.0);
  });
});
