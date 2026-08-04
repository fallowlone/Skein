// site/src/scripts/assess-apply-knowledge.ts
// The one place AssessReport.tsx's "save results" action touches storage OUTSIDE
// the assess session itself: merging report.ts's `toKnowledgeWrites()` output into
// the same KnowledgeState store path-io.ts owns (localStorage key below,
// `[conceptId, ConceptMastery][]` — identical shape to path-io.ts's own
// `serializeKnowledge`/`deserializeKnowledge`).
//
// This does NOT import path-io.ts: that module bundles `~/content/path/concepts.json`
// (1.1 MB) and several other content files as top-level imports with side effects
// (signals, effects), so importing anything from it — even just a key constant —
// would pull the whole module into /assess's chunk, exactly what Ruling 3
// (task-12-brief) says not to do. The key string below is a deliberate, commented
// mirror of path-io.ts's `C_KEY`-sibling `K_KEY` ("awesome.path-knowledge.v1"),
// not a re-declaration of a shared constant, because sharing it would require
// exporting from path-io.ts and inheriting the same cost.
//
// Writing this key directly is safe: the next time any path-io.ts-backed screen
// (Roadmap, Readiness) loads, its own `loadKnowledge()` reads this same key from
// scratch — there is no in-memory signal here to keep in sync, only durable
// storage two independent modules happen to agree on the shape of.
import type { KnowledgeWrite } from "./assess/report";

const KNOWLEDGE_KEY = "awesome.path-knowledge.v1"; // mirrors path-io.ts's K_KEY

interface StoredMastery {
  confidence: number;
  source: string;
  lastAt: number;
}

function isEntry(e: unknown): e is [string, StoredMastery] {
  if (!Array.isArray(e) || e.length !== 2) return false;
  const [id, m] = e as [unknown, unknown];
  return (
    typeof id === "string" &&
    !!m &&
    typeof m === "object" &&
    typeof (m as StoredMastery).confidence === "number" &&
    typeof (m as StoredMastery).source === "string" &&
    typeof (m as StoredMastery).lastAt === "number"
  );
}

function readStoredKnowledge(): [string, StoredMastery][] {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/**
 * Merges assess results into the durable KnowledgeState store. Unconditional
 * overwrite per concept (assess is a deliberate, deep re-measurement — the same
 * standing `applyDiagnostic` gives a fresh diagnostic result elsewhere), not a
 * monotone/no-lowering merge: a learner who ran /assess wants their new answer to
 * win, including downward corrections. Returns how many concepts were written, 0
 * on any storage failure (private mode / quota — degrades silently, same
 * convention as assess-io.ts and path-io.ts).
 */
export function applyKnowledgeWrites(writes: readonly KnowledgeWrite[]): number {
  if (!writes.length) return 0;
  try {
    const map = new Map(readStoredKnowledge());
    for (const w of writes) {
      map.set(w.conceptId, { confidence: w.confidence, source: w.source, lastAt: w.lastAt });
    }
    localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify([...map.entries()]));
    return writes.length;
  } catch {
    return 0;
  }
}
