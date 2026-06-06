// src/lint/rules/path.ts
//
// Build-gate validators for the P1 path-engine data artifacts under
// src/content/path/. Mirrors the runtime graph/override/goal semantics of
// src/scripts/path/{graph,planner}.ts but is self-contained (no ~ alias), so it
// runs in the standalone post-build lint process exactly like the other rules.
//
// Spec §8: DAG acyclic after overrides; every requires exists; every concept
// taught by ≥1 unit; diagnostic/goal concepts exist; diagnosed concept has a
// file; goals resolve; i18n parity on labels; overrides reference valid ids.
// A failure fails the build, like the existing rules.

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const BANDS = ["foundations", "surface", "middle", "advanced"] as const;
type Band = (typeof BANDS)[number];
const BAND_RANK: Record<Band, number> = { foundations: 0, surface: 1, middle: 2, advanced: 3 };

export interface PathConceptLike {
  id: string;
  label: { en: string; ru: string };
  track: string;
  band: string;
  requires: string[];
}
export interface PathUnitLike { teaches: string[]; requires: string[]; estMin: number }
export interface PathGoalLike {
  id: string;
  label: { en: string; ru: string };
  target: { rule?: string; concepts?: string[] };
  trackWeights?: Record<string, number>;
}
export interface PathOverridesLike {
  addEdges?: { concept: string; requires: string }[];
  removeEdges?: { concept: string; requires: string }[];
  retag?: { unit: string; teaches?: string[]; requires?: string[] }[];
}
export interface PathDiagnosticLike {
  concept: string;
  items: { id: string; type: string; prompt: { en: string; ru: string }; choices?: unknown[]; answer: unknown }[];
}
export interface PathData {
  concepts: PathConceptLike[];
  unitConcepts: Record<string, PathUnitLike>;
  goals: PathGoalLike[];
  overrides: PathOverridesLike;
  diagnostics: PathDiagnosticLike[]; // one entry per diagnostics/<concept>.json file found
  crossTrackEdges?: { concept: string; requires: string }[]; // optional curated source (cross-track-edges.json)
}

// Effective requires-edges after applying overrides (same order as graph.ts).
function effectiveRequires(concepts: PathConceptLike[], ov: PathOverridesLike): Map<string, string[]> {
  const req = new Map<string, string[]>();
  for (const c of concepts) req.set(c.id, [...c.requires]);
  for (const e of ov.addEdges ?? []) {
    if (!req.has(e.concept)) continue;
    const arr = req.get(e.concept)!;
    if (!arr.includes(e.requires)) arr.push(e.requires);
  }
  for (const e of ov.removeEdges ?? []) {
    if (req.has(e.concept)) req.set(e.concept, req.get(e.concept)!.filter((r) => r !== e.requires));
  }
  return req;
}

// Kahn cycle detection; returns the ids left unplaced (the cycle) or [].
function cycleNodes(ids: Set<string>, req: Map<string, string[]>): string[] {
  const indeg = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const id of ids) indeg.set(id, 0);
  for (const id of ids) {
    for (const r of req.get(id) ?? []) {
      if (!ids.has(r)) continue;
      indeg.set(id, (indeg.get(id) ?? 0) + 1);
      (dependents.get(r) ?? dependents.set(r, []).get(r)!).push(id);
    }
  }
  const queue = [...ids].filter((id) => (indeg.get(id) ?? 0) === 0);
  let placed = 0;
  while (queue.length) {
    const id = queue.shift()!;
    placed++;
    for (const d of dependents.get(id) ?? []) {
      indeg.set(d, (indeg.get(d) ?? 0) - 1);
      if ((indeg.get(d) ?? 0) === 0) queue.push(d);
    }
  }
  if (placed === ids.size) return [];
  return [...ids].filter((id) => (indeg.get(id) ?? 0) > 0);
}

function resolveGoal(goal: PathGoalLike, concepts: PathConceptLike[]): string[] {
  if (goal.target.concepts) return [...goal.target.concepts];
  const m = (goal.target.rule ?? "").match(/^band>=(\w+)$/);
  if (m) {
    const min = BAND_RANK[m[1] as Band];
    if (min === undefined) return [];
    return concepts.filter((c) => BAND_RANK[c.band as Band] >= min).map((c) => c.id);
  }
  return [];
}

/** Pure validator: returns a list of `path: …` errors (empty = clean). */
export function validatePathData(data: PathData): string[] {
  const errs: string[] = [];
  const { concepts, unitConcepts, goals, overrides, diagnostics } = data;
  const push = (m: string) => errs.push(`path: ${m}`);

  // concept ids + label parity + band/track sanity
  const ids = new Set<string>();
  for (const c of concepts) {
    if (ids.has(c.id)) push(`duplicate concept id "${c.id}"`);
    ids.add(c.id);
    if (!c.label?.en?.trim() || !c.label?.ru?.trim()) push(`concept "${c.id}" missing en/ru label`);
    if (!BANDS.includes(c.band as Band)) push(`concept "${c.id}" has invalid band "${c.band}"`);
    if (!c.track?.trim()) push(`concept "${c.id}" has empty track`);
  }
  // requires referential integrity
  for (const c of concepts) for (const r of c.requires) {
    if (!ids.has(r)) push(`concept "${c.id}" requires unknown concept "${r}"`);
  }

  // unit-concepts referential integrity + coverage
  const taught = new Set<string>();
  for (const [uid, u] of Object.entries(unitConcepts)) {
    if (!u.teaches?.length) push(`unit "${uid}" teaches no concepts`);
    for (const t of u.teaches ?? []) {
      if (!ids.has(t)) push(`unit "${uid}" teaches unknown concept "${t}"`);
      taught.add(t);
    }
    for (const r of u.requires ?? []) if (!ids.has(r)) push(`unit "${uid}" requires unknown concept "${r}"`);
    if (!(Number.isFinite(u.estMin) && u.estMin > 0)) push(`unit "${uid}" has invalid estMin ${u.estMin}`);
  }
  let orphans = 0;
  for (const id of ids) if (!taught.has(id)) {
    if (orphans++ < 15) push(`concept "${id}" is taught by no unit`);
  }
  if (orphans > 15) push(`…and ${orphans - 15} more untaught concepts`);

  // overrides reference valid ids
  for (const e of overrides.addEdges ?? []) {
    if (!ids.has(e.concept)) push(`override addEdges: unknown concept "${e.concept}"`);
    if (!ids.has(e.requires)) push(`override addEdges: unknown prereq "${e.requires}"`);
  }
  for (const e of overrides.removeEdges ?? []) {
    if (!ids.has(e.concept)) push(`override removeEdges: unknown concept "${e.concept}"`);
  }
  for (const e of overrides.retag ?? []) {
    if (!(e.unit in unitConcepts)) push(`override retag: unknown unit "${e.unit}"`);
    for (const t of e.teaches ?? []) if (!ids.has(t)) push(`override retag: unknown teaches concept "${t}"`);
    for (const r of e.requires ?? []) if (!ids.has(r)) push(`override retag: unknown requires concept "${r}"`);
  }

  // cross-track-edges.json source sanity (if present): ids exist + genuinely cross-track.
  const trackById = new Map(concepts.map((c) => [c.id, c.track]));
  for (const e of data.crossTrackEdges ?? []) {
    if (!e || typeof e.concept !== "string" || typeof e.requires !== "string") { push(`cross-track-edges malformed element`); continue; }
    if (!ids.has(e.concept)) push(`cross-track-edges: unknown concept "${e.concept}"`);
    if (!ids.has(e.requires)) push(`cross-track-edges: unknown prereq "${e.requires}"`);
    const tx = trackById.get(e.concept), ty = trackById.get(e.requires);
    if (tx && ty && tx === ty) push(`cross-track-edges: "${e.concept}→${e.requires}" is intra-track (${tx})`);
  }

  // acyclic after overrides
  const cyc = cycleNodes(ids, effectiveRequires(concepts, overrides));
  if (cyc.length) push(`concept graph has a cycle (${cyc.slice(0, 8).join(", ")}${cyc.length > 8 ? ", …" : ""})`);

  // goals resolve to ≥1 existing concept
  for (const g of goals) {
    if (!g.label?.en?.trim() || !g.label?.ru?.trim()) push(`goal "${g.id}" missing en/ru label`);
    const targets = resolveGoal(g, concepts);
    if (!targets.length) push(`goal "${g.id}" resolves to no concepts`);
    for (const t of g.target.concepts ?? []) if (!ids.has(t)) push(`goal "${g.id}" targets unknown concept "${t}"`);
  }

  // diagnostics: file concept exists + minimal objective shape (2-4 items, en/ru prompts)
  for (const d of diagnostics) {
    if (!ids.has(d.concept)) push(`diagnostic for unknown concept "${d.concept}"`);
    if (!Array.isArray(d.items) || d.items.length < 2 || d.items.length > 4) {
      push(`diagnostic "${d.concept}" must have 2-4 items (found ${d.items?.length ?? 0})`);
    }
    for (const it of d.items ?? []) {
      if (it.type !== "mcq" && it.type !== "blanks") push(`diagnostic "${d.concept}" item "${it.id}" has invalid type "${it.type}"`);
      if (!it.prompt?.en?.trim() || !it.prompt?.ru?.trim()) push(`diagnostic "${d.concept}" item "${it.id}" missing en/ru prompt`);
      if (it.type === "mcq" && !(Array.isArray(it.choices) && it.choices.length >= 2)) push(`diagnostic "${d.concept}" mcq item "${it.id}" needs ≥2 choices`);
      if (it.answer === undefined || it.answer === null) push(`diagnostic "${d.concept}" item "${it.id}" missing answer`);
    }
  }

  return errs;
}

async function readJson<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { return null; }
}

/** Source-level entry point (joins the linter). No path artifacts → no-op (other branches). */
export async function checkPath(siteSrc: string): Promise<string[]> {
  const dir = join(siteSrc, "content/path");
  const concepts = await readJson<PathConceptLike[]>(join(dir, "concepts.json"));
  if (!concepts) return []; // path engine data not present on this branch
  const unitConcepts = (await readJson<Record<string, PathUnitLike>>(join(dir, "unit-concepts.json"))) ?? {};
  const goals = (await readJson<PathGoalLike[]>(join(dir, "goals.json"))) ?? [];
  const overrides = (await readJson<PathOverridesLike>(join(dir, "concept-overrides.json"))) ?? {};
  const crossTrackEdges = (await readJson<{ concept: string; requires: string }[]>(join(dir, "cross-track-edges.json"))) ?? [];

  const diagnostics: PathDiagnosticLike[] = [];
  try {
    for (const f of await readdir(join(dir, "diagnostics"))) {
      if (!f.endsWith(".json")) continue;
      const d = await readJson<PathDiagnosticLike>(join(dir, "diagnostics", f));
      if (d) {
        // filename must match the declared concept (keeps the "diagnosed concept has a file" map honest)
        const fromName = f.replace(/\.json$/, "");
        if (d.concept !== fromName) diagnostics.push({ concept: `${fromName}!=${d.concept}`, items: [] });
        else diagnostics.push(d);
      }
    }
  } catch { /* no diagnostics dir yet */ }

  return validatePathData({ concepts, unitConcepts, goals, overrides, diagnostics, crossTrackEdges });
}
