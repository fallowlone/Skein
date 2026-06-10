/**
 * Anonymous usage metrics. Fire-and-forget: every call is wrapped so a missing
 * or failing backend can never break the page. No PII — a random client id only.
 */

const ID_KEY = "awesome.metrics.id";
const ENDPOINT = "/api/events";
const FLUSH_AT = 10;

type MetricEvent =
  | { type: "lesson_view"; lesson: string; track?: string; lang?: string }
  | { type: "lesson_time"; lesson: string; seconds: number }
  | { type: "practice_result"; lesson: string; taskId: string; taskType: string; correct: boolean };

function clientId(): string | null {
  try {
    let id = localStorage.getItem(ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ID_KEY, id);
    }
    return id;
  } catch {
    return null; // private browsing — skip metrics entirely
  }
}

let queue: MetricEvent[] = [];

function flush(): void {
  if (queue.length === 0) return;
  const id = clientId();
  if (!id) { queue = []; return; }
  const body = JSON.stringify({ clientId: id, events: queue.slice(0, 20) });
  queue = [];
  try {
    if (!navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) {
      // beacon queue full — drop silently; metrics are best-effort
    }
  } catch { /* no-op */ }
}

export function track(e: MetricEvent): void {
  try {
    queue.push(e);
    if (queue.length >= FLUSH_AT) flush();
  } catch { /* no-op */ }
}

export function recordPracticeResult(lessonKey: string, taskId: string, taskType: string, correct: boolean): void {
  track({ type: "practice_result", lesson: lessonKey, taskId, taskType, correct });
}

/**
 * Lesson page hook: one view event + active-time accounting.
 * Time counts only while the tab is visible; reported on pagehide.
 */
export function initLessonMetrics(lesson: string, track_: string, lang: string): void {
  track({ type: "lesson_view", lesson, track: track_, lang });

  let activeMs = 0;
  let since: number | null = document.visibilityState === "visible" ? Date.now() : null;

  const settle = () => {
    if (since !== null) { activeMs += Date.now() - since; since = null; }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") since = Date.now();
    else settle();
  });
  window.addEventListener("pagehide", () => {
    settle();
    const seconds = Math.round(activeMs / 1000);
    if (seconds >= 5) track({ type: "lesson_time", lesson, seconds });
    flush();
  });
}
