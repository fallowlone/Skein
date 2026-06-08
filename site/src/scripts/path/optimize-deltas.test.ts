// src/scripts/path/optimize-deltas.test.ts
import { describe, it, expect } from "vitest";
import { fullRequiredMin, goalDropDeltaMin, trackExcludeDeltaMin } from "./optimize-deltas";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { emptyState } from "./knowledge";
import { DEFAULT_CONFIG } from "./config";

const goalById = new Map(GOALS.map((g) => [g.id, g]));
const baseInput = (goalIds: string[]) => ({
  state: emptyState(),
  goals: goalIds.map((id) => goalById.get(id)!),
  config: { ...DEFAULT_CONFIG, goals: goalIds.map((id, i) => ({ id, priority: i + 1 })) },
  content: { concepts: CONCEPTS, units: UNITS, goalById },
  srsDue: [], now: 0, trackOrder: TRACK_ORDER,
});

describe("optimize-deltas", () => {
  it("fullRequiredMin scales by tier and counts the whole path (no stepsAhead slice)", () => {
    const mid = fullRequiredMin(baseInput(["senior-fullstack"]), "middle");
    const jr = fullRequiredMin(baseInput(["senior-fullstack"]), "junior");
    expect(mid).toBeGreaterThan(0);
    expect(jr).toBeLessThan(mid); // junior is cheaper
  });

  it("goalDropDeltaMin is the minutes that leave the path when a goal is dropped", () => {
    const delta = goalDropDeltaMin(baseInput(["senior-fullstack", "backend-job"]), "middle", "backend-job");
    expect(delta).toBeGreaterThanOrEqual(0);
  });

  it("trackExcludeDeltaMin is the minutes of a track's units removed from the path", () => {
    const delta = trackExcludeDeltaMin(baseInput(["senior-fullstack"]), "middle", "distributed");
    expect(delta).toBeGreaterThan(0); // distributed units exist in the senior-fullstack path
  });
});
