// site/src/scripts/path/config.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig, clampConfig } from "./config";

describe("config", () => {
  it("DEFAULT_CONFIG is internally valid (clamp is a no-op on it)", () => {
    expect(clampConfig(DEFAULT_CONFIG)).toEqual(DEFAULT_CONFIG);
  });
  it("clamps breadthVsDepth and priorities into range", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, breadthVsDepth: 5, pace: { stepsAhead: -3, srsAggressiveness: 9 } });
    expect(c.breadthVsDepth).toBe(1);
    expect(c.pace.stepsAhead).toBe(1);          // floor of 1 step
    expect(c.pace.srsAggressiveness).toBe(1);   // 0..1
  });
  it("mergeConfig overlays a stored partial onto defaults", () => {
    const c = mergeConfig({ excludedTracks: ["frontend"], goals: [{ id: "backend-job", priority: 2 }] });
    expect(c.excludedTracks).toEqual(["frontend"]);
    expect(c.goals).toEqual([{ id: "backend-job", priority: 2 }]);
    expect(c.breadthVsDepth).toBe(DEFAULT_CONFIG.breadthVsDepth); // untouched fields keep defaults
  });
  it("normalizes a too-old version by re-merging onto current defaults", () => {
    const c = mergeConfig({ version: 0 } as any);
    expect(c.version).toBe(DEFAULT_CONFIG.version);
    expect(c.breadthVsDepth).toBe(DEFAULT_CONFIG.breadthVsDepth);
  });
  it("clamps goal priority to >= 1", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, goals: [{ id: "x", priority: -3 }, { id: "y", priority: 0 }] });
    expect(c.goals.map((g) => g.priority)).toEqual([1, 1]);
  });
  it("clamps srsAggressiveness lower bound to 0", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, pace: { stepsAhead: 5, srsAggressiveness: -0.5 } });
    expect(c.pace.srsAggressiveness).toBe(0);
  });
  it("coerces non-finite numeric config to safe values", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, breadthVsDepth: NaN, pace: { stepsAhead: NaN, srsAggressiveness: NaN } });
    expect(c.breadthVsDepth).toBe(0);
    expect(c.pace.stepsAhead).toBe(1);
    expect(c.pace.srsAggressiveness).toBe(0);
  });
});
