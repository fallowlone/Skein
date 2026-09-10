export type LessonRenderNode =
  | { type: "text"; value: string }
  | { type: "raw"; value: string }
  | {
      type: "element";
      name: string;
      props?: Record<string, unknown>;
      children?: LessonRenderNode[];
    };

export interface LessonPayload {
  version: string;
  lesson: {
    key: string;
    lang: "en" | "ru";
    track: string;
    unit: string;
    slug: string;
    order: number;
    title: string;
    summary: string;
    estMin: number;
    status: string;
    lessonType?: "concept" | "coding" | "topic";
    level?: "zero" | "junior" | "middle" | "senior";
    sources: string[];
    prereqs: string[];
    mathPrereqs: string[];
    concepts: string[];
    body: {
      format: string;
      root?: LessonRenderNode[];
    };
  };
  graph: Record<string, unknown>;
  practice: { tasks?: unknown[] } | null;
  drill: {
    track: string;
    unit: string;
    intro: Record<"en" | "ru", string>;
    problems: unknown[];
  } | null;
  unit: Record<string, unknown> | null;
  track: Record<string, unknown> | null;
  concepts: Record<string, unknown>;
  lessonMeta: Record<string, unknown>;
  projects: Array<{ slug: string; title: string; pitch: string }>;
}

export type LessonPayloadResult =
  | { ok: true; payload: LessonPayload }
  | { ok: false; status: 404 | 502 | 503; code: string };

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

export function validLessonParams(
  lang: string | undefined,
  track: string | undefined,
  unit: string | undefined,
  lesson: string | undefined,
): lang is "en" | "ru" {
  return (
    (lang === "en" || lang === "ru") &&
    [track, unit, lesson].every((part) => typeof part === "string" && SEGMENT.test(part))
  );
}

export async function fetchLessonPayload(
  apiOrigin: string,
  path: { lang: "en" | "ru"; track: string; unit: string; lesson: string },
  fetchImpl: FetchLike = fetch,
): Promise<LessonPayloadResult> {
  const url = new URL(
    `/api/lessons/${path.lang}/${path.track}/${path.unit}/${path.lesson}`,
    apiOrigin,
  );

  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    return { ok: false, status: 502, code: "lesson_backend_unavailable" };
  }

  if (response.status === 404) return { ok: false, status: 404, code: "lesson_not_found" };
  if (response.status === 503) return { ok: false, status: 503, code: "lesson_backend_unconfigured" };
  if (!response.ok) return { ok: false, status: 502, code: "lesson_backend_error" };

  let payload: LessonPayload;
  try {
    payload = (await response.json()) as LessonPayload;
  } catch {
    return { ok: false, status: 502, code: "invalid_lesson_payload" };
  }

  if (
    !payload?.lesson ||
    payload.lesson.body?.format !== "lesson-render-tree-v1" ||
    !Array.isArray(payload.lesson.body.root)
  ) {
    return { ok: false, status: 502, code: "invalid_lesson_payload" };
  }

  return { ok: true, payload };
}
