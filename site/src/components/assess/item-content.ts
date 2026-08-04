// site/src/components/assess/item-content.ts
// The island's third owned responsibility (besides the clock and storage): looking
// up an AssessItem's actual content. AssessItem (item-pool.ts) deliberately carries
// no content, only lessonKey + taskId + metadata (Task 6) — the real question text
// lives in the `practice` content collection, served per-lesson at
// /practice/<lessonKey>.json (see src/pages/practice/[track]/[unit]/[lesson].json.ts).
//
// Cached per lessonKey at module scope so answering several items from the same
// lesson in one session (common — item-pool.ts's contamination control aside,
// nothing stops the adaptive selector from picking two items out of one lesson)
// fetches that lesson's JSON once, not once per item.
import { useEffect, useState } from "preact/hooks";
import type { PracticeTaskData } from "~/content.config";
import type { AssessItem } from "~/scripts/assess/types";

const cache = new Map<string, Promise<PracticeTaskData[]>>();

function fetchLessonTasks(lessonKey: string): Promise<PracticeTaskData[]> {
  let pending = cache.get(lessonKey);
  if (!pending) {
    pending = fetch(`/practice/${lessonKey}.json`).then((res) => {
      if (!res.ok) throw new Error(`practice content ${lessonKey}: HTTP ${res.status}`);
      return res.json() as Promise<PracticeTaskData[]>;
    });
    cache.set(lessonKey, pending);
  }
  return pending;
}

/** "loading" while in flight, `null` once settled with nothing found (fetch error
 *  or the taskId is missing from that lesson's tasks — a corrupt/stale item). */
export type ItemContent = PracticeTaskData | "loading" | null;

export function useItemContent(item: AssessItem | null): ItemContent {
  const [state, setState] = useState<ItemContent>("loading");

  useEffect(() => {
    if (!item) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState("loading");
    fetchLessonTasks(item.lessonKey)
      .then((tasks) => {
        if (cancelled) return;
        setState(tasks.find((t) => t.id === item.taskId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, [item?.lessonKey, item?.taskId]);

  return state;
}
