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

function isKnowledgeArray(v: unknown): v is [string, ConceptMastery][] {
  return (
    Array.isArray(v) &&
    v.every(
      (e) =>
        Array.isArray(e) &&
        e.length === 2 &&
        typeof e[0] === "string" &&
        e[1] !== null &&
        typeof e[1] === "object" &&
        typeof (e[1] as ConceptMastery).confidence === "number",
    )
  );
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
  if (!raw || typeof raw !== "object") return { ok: false, error: "Not a state bundle" };
  if (raw.version !== STATE_BUNDLE_VERSION)
    return { ok: false, error: `Unsupported bundle version: ${raw.version}` };
  if (
    "pathKnowledge" in raw &&
    raw.pathKnowledge !== undefined &&
    !isKnowledgeArray(raw.pathKnowledge)
  )
    return { ok: false, error: "pathKnowledge is malformed" };
  if (
    "pathConfig" in raw &&
    raw.pathConfig &&
    (!raw.pathConfig.goals || !raw.pathConfig.weights)
  )
    return { ok: false, error: "pathConfig is malformed" };
  if (
    "pathOverrides" in raw &&
    raw.pathOverrides &&
    typeof raw.pathOverrides !== "object"
  )
    return { ok: false, error: "pathOverrides is malformed" };
  return { ok: true, bundle: raw as StateBundle };
}
