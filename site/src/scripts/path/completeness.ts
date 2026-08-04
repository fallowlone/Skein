import type { ConceptGraph } from "./graph";
import { ancestors, descendants } from "./graph";
import type { KnowledgeState } from "./types";

export interface FrontierCompleteness {
  measured: number;
  declared: number;
  propagated: number;
  guessed: number;
  total: number;
}

export function frontierCompleteness(
  frontier: Set<string>,
  state: KnowledgeState,
  diagnosable: Set<string>, // accepted for signature stability; not needed to bucket by source
  graph: ConceptGraph,
): FrontierCompleteness {
  void diagnosable; // suppress unused-var lint

  // Build closure: frontier + all ancestors + all descendants of each frontier concept
  const closure = new Set<string>(frontier);
  for (const id of frontier) {
    for (const a of ancestors(graph, id)) closure.add(a);
    for (const d of descendants(graph, id)) closure.add(d);
  }

  let measured = 0;
  let declared = 0;
  let propagated = 0;
  let guessed = 0;

  for (const id of closure) {
    const source = state.get(id)?.source;
    // "assess" is a deliberate per-concept skill measurement (site/src/scripts/assess/),
    // at least as strong an evidence source as a one-shot diagnostic/pretest — it belongs
    // in the same bucket, not silently in "guessed" for having no explicit branch.
    if (source === "diagnostic" || source === "pretest" || source === "assess") {
      measured++;
    } else if (source === "declared") {
      declared++;
    } else if (source === "activity") {
      propagated++;
    } else {
      guessed++;
    }
  }

  return { measured, declared, propagated, guessed, total: closure.size };
}
