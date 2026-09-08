import type { KnowledgeState, ConceptMastery } from "./types";
import type { Overrides } from "./graph";

export const STATE_BUNDLE_VERSION = 1;

export interface StateBundle {
  version: number;
  exportedAt: number;
  pathKnowledge?: [string, ConceptMastery][];
  pathConfig?: unknown;
  pathOverrides?: Overrides;
  userState?: unknown;
}

export function serializeStateBundle(
  parts: { knowledge: KnowledgeState; config: unknown; overrides: Overrides; userState: unknown },
  now: number,
): StateBundle {
  return {
    version: STATE_BUNDLE_VERSION,
    exportedAt: now,
    pathKnowledge: [...parts.knowledge.entries()],
    pathConfig: parts.config,
    pathOverrides: parts.overrides,
    userState: parts.userState,
  };
}

const SOURCES = new Set(["pretest", "diagnostic", "activity", "declared", "review", "assess"]);

function isKnowledgeArray(v: unknown): v is [string, ConceptMastery][] {
  if (!Array.isArray(v)) return false;
  const ids = new Set<string>();
  return v.every((e) => {
    if (!Array.isArray(e) || e.length !== 2 || typeof e[0] !== "string" || !e[0] || ids.has(e[0])) return false;
    const m = e[1] as Partial<ConceptMastery> | null;
    if (!m || typeof m !== "object") return false;
    if (!Number.isFinite(m.confidence) || m.confidence! < 0 || m.confidence! > 1) return false;
    if (!Number.isFinite(m.lastAt) || m.lastAt! < 0) return false;
    if (typeof m.source !== "string" || !SOURCES.has(m.source)) return false;
    ids.add(e[0]);
    return true;
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isEdgeArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((e) => isObject(e) && typeof e.concept === "string" && typeof e.requires === "string");
}

function isConfig(v: unknown): boolean {
  if (!isObject(v)) return false;
  if ("goals" in v && !Array.isArray(v.goals)) return false;
  if ("weights" in v && !isObject(v.weights)) return false;
  if ("pace" in v && !isObject(v.pace)) return false;
  if ("excludedTracks" in v && !Array.isArray(v.excludedTracks)) return false;
  if ("customTargets" in v && !Array.isArray(v.customTargets)) return false;
  return true;
}

function isOverrides(v: unknown): v is Overrides {
  if (!isObject(v)) return false;
  return (v.addEdges === undefined || isEdgeArray(v.addEdges)) &&
    (v.removeEdges === undefined || isEdgeArray(v.removeEdges)) &&
    (v.retag === undefined || Array.isArray(v.retag));
}

function parseObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Validate the fields current consumers depend on while allowing unknown future evidence fields. */
export function validateLearningStorageEntry(key: string, value: string): string | null {
  if (key.startsWith("atlas.practice-attempts.")) {
    const parsed = parseObject(value);
    if (!parsed) return `Malformed ${key}`;
    for (const record of Object.values(parsed)) {
      if (!isObject(record)) return `Malformed ${key}`;
      if (!Number.isInteger(record.attempts) || (record.attempts as number) < 0) return `Malformed ${key}`;
      if (!Number.isInteger(record.passes) || (record.passes as number) < 0 || (record.passes as number) > (record.attempts as number)) return `Malformed ${key}`;
      if (record.lastResult !== "pass" && record.lastResult !== "fail") return `Malformed ${key}`;
      if (!Number.isFinite(record.lastAt) || (record.lastAt as number) < 0) return `Malformed ${key}`;
    }
    return null;
  }
  if (key.startsWith("atlas.practice-responses.")) {
    const parsed = parseObject(value);
    return parsed && Object.values(parsed).every((v) => typeof v === "string") ? null : `Malformed ${key}`;
  }
  if (key.startsWith("atlas.practice.")) {
    const parsed = parseObject(value);
    const statuses = new Set(["seen", "attempted", "done"]);
    return parsed && Object.values(parsed).every((v) => typeof v === "string" && statuses.has(v)) ? null : `Malformed ${key}`;
  }
  if (key.startsWith("atlas.practice-selfgrade.")) {
    const parsed = parseObject(value);
    if (!parsed) return `Malformed ${key}`;
    const grades = new Set(["hit", "partial", "miss", "skipped"]);
    for (const v of Object.values(parsed)) {
      if (typeof v === "string") { if (!grades.has(v)) return `Malformed ${key}`; continue; }
      if (!isObject(v) || typeof v.grade !== "string" || !grades.has(v.grade) || !Number.isFinite(v.lastAt) || (v.lastAt as number) < 0) return `Malformed ${key}`;
    }
    return null;
  }
  if (key === "atlas.review.v1") {
    const parsed = parseObject(value);
    if (!parsed) return `Malformed ${key}`;
    for (const card of Object.values(parsed)) {
      if (!isObject(card) || typeof card.lessonKey !== "string" || !card.lessonKey || !Number.isFinite(card.dueAt)) return `Malformed ${key}`;
    }
    return null;
  }
  if (key === "skein.path-knowledge.v1") {
    try { return isKnowledgeArray(JSON.parse(value)) ? null : `Malformed ${key}`; } catch { return `Malformed ${key}`; }
  }
  if (key === "skein.path-config.v1") {
    try { return isConfig(JSON.parse(value)) ? null : `Malformed ${key}`; } catch { return `Malformed ${key}`; }
  }
  if (key === "skein.path-overrides.v1") {
    try { return isOverrides(JSON.parse(value)) ? null : `Malformed ${key}`; } catch { return `Malformed ${key}`; }
  }
  if (key === "skein.english.register.v1") return value === "engineering" || value === "everyday" ? null : `Invalid ${key}`;
  if (key === "skein.user-state.v1" || key === "skein.english.v2" || key === "atlas.assess.v1") {
    return parseObject(value) ? null : `Malformed ${key}`;
  }
  return null;
}

export function parseStateBundle(
  text: string,
): { ok: true; bundle: StateBundle } | { ok: false; error: string } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Not valid JSON" };
  }
  if (!isObject(raw)) return { ok: false, error: "Not a state bundle" };
  if (raw.version !== STATE_BUNDLE_VERSION)
    return { ok: false, error: `Unsupported bundle version: ${raw.version}` };
  if (
    "pathKnowledge" in raw &&
    raw.pathKnowledge !== undefined &&
    !isKnowledgeArray(raw.pathKnowledge)
  )
    return { ok: false, error: "pathKnowledge is malformed" };
  if ("exportedAt" in raw && !Number.isFinite(raw.exportedAt))
    return { ok: false, error: "exportedAt is malformed" };
  if ("pathConfig" in raw && raw.pathConfig !== undefined && !isConfig(raw.pathConfig))
    return { ok: false, error: "pathConfig is malformed" };
  if ("pathOverrides" in raw && raw.pathOverrides !== undefined && !isOverrides(raw.pathOverrides))
    return { ok: false, error: "pathOverrides is malformed" };
  return { ok: true, bundle: raw as unknown as StateBundle };
}
