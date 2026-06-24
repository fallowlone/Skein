// site/src/scripts/path/config.test.ts
import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, mergeConfig, clampConfig, coldStartConfig, COLD_START_GOAL_ID } from "./config";

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
  it("repairs a legacy decayFloor above masteryThreshold (cap = threshold - 0.1)", () => {
    expect(DEFAULT_CONFIG.weights.decayFloor).toBe(0.3);
    // a stored pre-repair config (0.85 — above the threshold, made decay a no-op) is pulled down
    // to threshold-0.1; for the default threshold (0.6) that cap is 0.5.
    expect(mergeConfig({ weights: { ...DEFAULT_CONFIG.weights, decayFloor: 0.85 } }).weights.decayFloor).toBeCloseTo(0.5, 9);
    // and the cap tracks the threshold, not a fixed 0.5: threshold 0.7 → cap 0.6.
    expect(
      mergeConfig({ weights: { ...DEFAULT_CONFIG.weights, masteryThreshold: 0.7, decayFloor: 0.85 } }).weights.decayFloor,
    ).toBeCloseTo(0.6, 9);
  });
});

describe("cold-start goal", () => {
  it("cold-start config targets the job-ready-junior goal", () => {
    expect(COLD_START_GOAL_ID).toBe("job-ready-junior");
    expect(coldStartConfig().goals).toEqual([{ id: COLD_START_GOAL_ID, priority: 1 }]);
  });

  it("cold-start config is otherwise the default (only the goal differs)", () => {
    expect(coldStartConfig()).toEqual({ ...DEFAULT_CONFIG, goals: [{ id: COLD_START_GOAL_ID, priority: 1 }] });
    // the general base goal must NOT be cold-start — existing learners keep senior-fullstack
    expect(DEFAULT_CONFIG.goals).toEqual([{ id: "senior-fullstack", priority: 1 }]);
  });

  it("cold-start config survives a clamp round-trip unchanged", () => {
    expect(clampConfig(coldStartConfig())).toEqual(coldStartConfig());
  });

  it("an existing learner's stored config keeps its own goal (cold-start is NOT applied on merge)", () => {
    // mergeConfig overlays a *stored* config onto DEFAULT_CONFIG — the cold-start swap lives only in
    // coldStartConfig()/loadConfig's no-state branch, so merging never retargets a saved learner.
    const stored = mergeConfig({ goals: [{ id: "interview-prep", priority: 1 }] });
    expect(stored.goals).toEqual([{ id: "interview-prep", priority: 1 }]);

    // an existing learner with knowledge but no stored goals falls back to the general default,
    // NOT the cold-start goal.
    expect(mergeConfig({}).goals).toEqual([{ id: "senior-fullstack", priority: 1 }]);
  });
});

describe("clampConfig decayFloor invariant", () => {
  it("keeps decayFloor strictly below masteryThreshold for any knobs", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, weights: { lessons: 0.3, practice: 0.4, masteryThreshold: 0.4, decayFloor: 0.5 } });
    expect(c.weights.masteryThreshold).toBe(0.4);
    expect(c.weights.decayFloor).toBeLessThanOrEqual(0.4 - 0.1 + 1e-9);
    expect(c.weights.decayFloor).toBeCloseTo(0.3, 9); // capped at threshold - 0.1
  });
  it("clamps decayFloor to 0 when threshold is at its floor", () => {
    const c = clampConfig({ ...DEFAULT_CONFIG, weights: { lessons: 0.3, practice: 0.4, masteryThreshold: 0.1, decayFloor: 0.4 } });
    expect(c.weights.masteryThreshold).toBe(0.1);
    expect(c.weights.decayFloor).toBe(0); // max(0, 0.1 - 0.1)
  });
  it("leaves safe defaults untouched", () => {
    const c = clampConfig(DEFAULT_CONFIG);
    expect(c.weights.decayFloor).toBe(0.3);
    expect(c.weights.masteryThreshold).toBe(0.6);
  });
});
