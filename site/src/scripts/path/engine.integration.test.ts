// site/src/scripts/path/engine.integration.test.ts
import { describe, it, expect } from "vitest";
import { CONCEPTS, UNITS, GOALS, TRACK_ORDER } from "./__fixtures__/mini-graph";
import { DEFAULT_CONFIG } from "./config";
import { emptyState, applyDiagnostic } from "./knowledge";
import { buildConceptGraph } from "./graph";
import { buildPath } from "./planner";
import { schedulePlan } from "./schedule";
import type { PathConfig } from "./types";

const goalById = new Map(GOALS.map((g) => [g.id, g]));
const DAY = 86_400_000;
const MON = Date.UTC(2026, 5, 8);

describe("engine integration", () => {
  it("cold-start senior-fullstack path starts at foundations and respects prereqs", () => {
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]],
      config: { ...DEFAULT_CONFIG, pace: { stepsAhead: 8, srsAggressiveness: 0 } },
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    const names = path.steps.map((s) => s.unit);
    expect(names[0]).toBe("networking/01-ip");
    expect(names.indexOf("networking/02-tcp")).toBeLessThan(names.indexOf("distributed/01-repl"));
    expect(names.indexOf("databases/03-mvcc")).toBeLessThan(names.indexOf("distributed/01-repl"));
  });

  it("a learner who already knows mvcc + tcp gets a shorter path", () => {
    let s = emptyState();
    s = applyDiagnostic(s, buildConceptGraph(CONCEPTS), "mvcc", 1, 0);          // lifts indexing, relational-model
    s = applyDiagnostic(s, buildConceptGraph(CONCEPTS), "tcp-handshake", 1, 0); // lifts ip/ports
    const path = buildPath({
      state: s, goals: [GOALS[1]], // backend-job: indexing, mvcc, tcp-handshake — all known/derivable
      config: { ...DEFAULT_CONFIG, pace: { stepsAhead: 8, srsAggressiveness: 0 } },
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
    });
    expect(path.steps.length).toBe(0); // nothing left to learn for that goal
  });

  it("never emits a unit before a unit teaching one of its required concepts (both modes)", () => {
    const teacherOf = new Map<string, string>();
    for (const u of UNITS) for (const c of u.teaches) teacherOf.set(c, u.unit);
    const requiresOf = new Map(UNITS.map((u) => [u.unit, u.requires]));
    for (const bvd of [0, 1]) { // depth and breadth
      const path = buildPath({
        state: emptyState(), goals: [GOALS[0]],
        config: { ...DEFAULT_CONFIG, breadthVsDepth: bvd, pace: { stepsAhead: 99, srsAggressiveness: 0 } },
        content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: 0, trackOrder: TRACK_ORDER,
      });
      const pos = new Map(path.steps.map((s, i) => [s.unit, i]));
      for (const s of path.steps) {
        for (const reqConcept of requiresOf.get(s.unit) ?? []) {
          const teacher = teacherOf.get(reqConcept);
          if (teacher && pos.has(teacher)) expect(pos.get(teacher)!).toBeLessThan(pos.get(s.unit)!);
        }
      }
    }
  });

  it("deadline mode produces a dated plan and flags over-budget with dropped scope", () => {
    const config: PathConfig = {
      ...DEFAULT_CONFIG,
      deadline: { targetDateMs: MON + 3 * DAY, perWeekdayHours: [1,1,1,0,0,0,0], tzOffsetMin: 0 }, // Mon..Wed 1h = 180 min
    };
    const path = buildPath({
      state: emptyState(), goals: [GOALS[0]], config,
      content: { concepts: CONCEPTS, units: UNITS, goalById }, srsDue: [], now: MON, trackOrder: TRACK_ORDER,
    });
    const sched = schedulePlan(path, config.deadline!, MON);
    expect(sched.days.length).toBe(3);
    expect(sched.feasibility.verdict).toBe("over");        // full senior path >> 180 min
    expect(sched.feasibility.dropped.length).toBeGreaterThan(0);
    expect(sched.countdownDays).toBe(3);
  });
});
