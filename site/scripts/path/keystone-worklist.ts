/**
 * Keystone authoring worklist CLI.
 *
 * Reuses pure logic from src/scripts/path/:
 *   - buildConceptGraph  (graph.ts)
 *   - resolveGoalTargets (goal-resolve.ts)
 *   - keystoneWorklist   (keystone.ts)
 *
 * Run:  bun scripts/path/keystone-worklist.ts
 * Adds: src/content/path/keystone-worklist.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { buildConceptGraph, type Overrides } from "~/scripts/path/graph";
import { resolveGoalTargets } from "~/scripts/path/goal-resolve";
import { keystoneWorklist } from "~/scripts/path/keystone";
import type { Concept, Goal } from "~/scripts/path/types";

// ---------------------------------------------------------------------------
// Pure computation — no FS, no side-effects. Exportable for tests.
// ---------------------------------------------------------------------------

export interface WorklistRow {
  id: string;
  label: string;
  band: string;
  track: string;
  marginal: number;
}

export interface Worklist {
  goal: string;
  k: number;
  rows: WorklistRow[];
}

export function computeWorklist(
  concepts: Concept[],
  overrides: Overrides,
  goal: Goal,
  diagnosable: Set<string>,
  k = 200,
): Worklist {
  const graph = buildConceptGraph(concepts, overrides);
  const frontier = new Set(resolveGoalTargets(goal, concepts));
  const rows = keystoneWorklist(graph, frontier, diagnosable, k);

  const conceptById = new Map(concepts.map((c) => [c.id, c]));

  const enriched: WorklistRow[] = rows.map(({ id, marginal }) => {
    const c = conceptById.get(id)!;
    return {
      id,
      label: c.label.en,
      band: c.band,
      track: c.track,
      marginal,
    };
  });

  return { goal: goal.id, k, rows: enriched };
}

// ---------------------------------------------------------------------------
// CLI entry-point — only runs when executed directly via bun
// ---------------------------------------------------------------------------

if (import.meta.main) {
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const DATA = join(ROOT, "src/content/path");

  const concepts: Concept[] = JSON.parse(
    readFileSync(join(DATA, "concepts.json"), "utf8"),
  );
  const overrides: Overrides = JSON.parse(
    readFileSync(join(DATA, "concept-overrides.json"), "utf8"),
  );
  const goals: Goal[] = JSON.parse(
    readFileSync(join(DATA, "goals.json"), "utf8"),
  );
  const diagArray: string[] = JSON.parse(
    readFileSync(join(DATA, "diagnostics-index.json"), "utf8"),
  );

  const goal = goals.find((g) => g.id === "job-ready-junior");
  if (!goal) throw new Error("goal 'job-ready-junior' not found in goals.json");

  const diagnosable = new Set(diagArray);
  const result = computeWorklist(concepts, overrides, goal, diagnosable);

  const outPath = join(DATA, "keystone-worklist.json");
  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");

  const sumMarginal = result.rows.reduce((n, r) => n + r.marginal, 0);
  process.stderr.write(
    `keystone-worklist: ${result.rows.length} rows, summed marginal = ${sumMarginal}\n`,
  );
}
