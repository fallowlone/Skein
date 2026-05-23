import { describe, expect, test } from "vitest";
import { checkLessonRules, checkMathPrereqs } from "./lessons";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LESSON_PATH = "dist/en/learn/math/01-counting/index.html";

function skeleton(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("step") ? `<div data-lesson-step></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("worked") ? `<div data-lesson-section="worked-example"></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
  ].join("\n");
}

describe("checkLessonRules", () => {
  test("a complete lesson passes", () => {
    expect(checkLessonRules(skeleton(), LESSON_PATH)).toEqual([]);
  });

  test("ignores non-lesson pages", () => {
    expect(checkLessonRules("<div></div>", "dist/en/networking/03-tcp-handshake/index.html")).toEqual([]);
  });

  test("flags a missing skeleton section", () => {
    const errs = checkLessonRules(skeleton({ recap: false }), LESSON_PATH);
    expect(errs.some((e) => /recap/.test(e))).toBe(true);
  });

  test("flags fewer than 4 practice problems", () => {
    const html = skeleton().replace(
      /<section data-practice-set>[\s\S]*?<\/section>/,
      `<section data-practice-set><div data-practice-problem></div></section>`
    );
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /practice/.test(e))).toBe(true);
  });

  test("flags zero visual widgets", () => {
    const errs = checkLessonRules(skeleton({ visual: false }), LESSON_PATH);
    expect(errs.some((e) => /visual/.test(e))).toBe(true);
  });

  test("flags more than 5 hydration islands", () => {
    const html = skeleton() + "<astro-island></astro-island>".repeat(6);
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /hydration/.test(e))).toBe(true);
  });

  test("flags a forward link to a higher-ordered lesson family", () => {
    const html = skeleton() + `<a href="/en/learn/math/99-future-lesson/">x</a>`;
    const errs = checkLessonRules(html, LESSON_PATH);
    expect(errs.some((e) => /forward/.test(e))).toBe(true);
  });
});

const ALGO_PATH = "dist/en/learn/algorithms/01-what-is-an-algorithm/index.html";

function algoSkeleton(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("idea") ? `<div data-lesson-section="idea"></div>` : "",
    has("code") ? `<div data-lesson-section="code"></div>` : "",
    has("trace") ? `<div data-lesson-section="trace"><div data-lesson-visual></div></div>` : "",
    has("complexity") ? `<div data-lesson-section="complexity"></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
  ].join("\n");
}

describe("checkLessonRules — algorithms track", () => {
  test("a complete algorithm lesson passes", () => {
    expect(checkLessonRules(algoSkeleton(), ALGO_PATH)).toEqual([]);
  });

  test("flags a missing algorithm section", () => {
    const errs = checkLessonRules(algoSkeleton({ complexity: false }), ALGO_PATH);
    expect(errs.some((e) => /complexity/.test(e))).toBe(true);
  });

  test("flags a missing trace visual", () => {
    const errs = checkLessonRules(
      algoSkeleton().replace(`<div data-lesson-visual></div>`, ""),
      ALGO_PATH
    );
    expect(errs.some((e) => /visual/.test(e))).toBe(true);
  });

  test("does not require the math 'worked-example' section", () => {
    const errs = checkLessonRules(algoSkeleton(), ALGO_PATH);
    expect(errs.some((e) => /worked-example/.test(e))).toBe(false);
  });

  test("a cross-track link to a math lesson is not a forward link", () => {
    const html = algoSkeleton() + `<a href="/en/learn/math/08-logarithms/">x</a>`;
    const errs = checkLessonRules(html, ALGO_PATH);
    expect(errs.some((e) => /forward/.test(e))).toBe(false);
  });
});

async function mpFixture(root: string, rel: string, body: string) {
  const dir = join(root, "content/lessons", rel);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"), body);
}

describe("checkMathPrereqs", () => {
  test("flags a mathPrereqs ref with no matching math lesson", async () => {
    const r = await mkdtemp(join(tmpdir(), "mp-"));
    await mpFixture(r, "en/algorithms/01-thinking-complexity/01-what-is-an-algorithm",
      `---\nslug: 01-what-is-an-algorithm\nlang: en\ntrack: algorithms\nmathPrereqs: ["math/08-growth/02-logarithms"]\n---\nbody\n`);
    const errs = await checkMathPrereqs(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /02-logarithms/.test(e))).toBe(true);
  });

  test("passes when the referenced math lesson exists", async () => {
    const r = await mkdtemp(join(tmpdir(), "mp-"));
    await mpFixture(r, "en/math/08-growth/02-logarithms",
      `---\nslug: 02-logarithms\nlang: en\ntrack: math\n---\nbody\n`);
    await mpFixture(r, "en/algorithms/01-thinking-complexity/01-what-is-an-algorithm",
      `---\nslug: 01-what-is-an-algorithm\nlang: en\ntrack: algorithms\nmathPrereqs: ["math/08-growth/02-logarithms"]\n---\nbody\n`);
    const errs = await checkMathPrereqs(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });
});

function basecsConcept(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    `<article data-lesson-type="concept">`,
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("step") ? `<div data-lesson-step></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("worked") ? `<div data-lesson-section="worked-example"></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
    `</article>`,
  ].join("\n");
}

function basecsCoding(opts: Partial<Record<string, boolean>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  return [
    `<article data-lesson-type="coding">`,
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("goal") ? `<div data-lesson-section="goal"></div>` : "",
    has("idea") ? `<div data-lesson-section="idea"></div>` : "",
    has("code") ? `<div data-lesson-section="code"></div>` : "",
    has("trace") ? `<div data-lesson-section="trace"></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("practice")
      ? `<section data-practice-set><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div><div data-practice-problem></div></section>`
      : "",
    has("check") ? `<div data-lesson-section="check"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
    `</article>`,
  ].join("\n");
}

const BASECS_PATH = "dist/en/learn/base-cs/01-bits-and-binary/index.html";

describe("checkLessonRules — base-cs", () => {
  test("a complete concept lesson passes", () => {
    expect(checkLessonRules(basecsConcept(), BASECS_PATH)).toEqual([]);
  });

  test("a complete coding lesson passes", () => {
    expect(checkLessonRules(basecsCoding(), BASECS_PATH)).toEqual([]);
  });

  test("flags a base-cs lesson with no lessonType", () => {
    const html = basecsConcept().replace(' data-lesson-type="concept"', "");
    const errs = checkLessonRules(html, BASECS_PATH);
    expect(errs.some((e) => /lessonType/.test(e))).toBe(true);
  });

  test("flags a concept lesson missing the worked-example section", () => {
    const errs = checkLessonRules(basecsConcept({ worked: false }), BASECS_PATH);
    expect(errs.some((e) => /worked-example/.test(e))).toBe(true);
  });

  test("flags a coding lesson missing the trace section", () => {
    const errs = checkLessonRules(basecsCoding({ trace: false }), BASECS_PATH);
    expect(errs.some((e) => /trace/.test(e))).toBe(true);
  });

  test("does not require a complexity section on a coding lesson", () => {
    expect(checkLessonRules(basecsCoding(), BASECS_PATH)).toEqual([]);
  });
});

// ── Topic lesson tests ────────────────────────────────────────────────────────

const TOPIC_PATH = "dist/en/learn/topic/01-networking/index.html";

/**
 * Minimal complete topic skeleton.
 * - sections: hook, crux, explanation, key-takeaway, recap
 * - 1 data-lesson-visual
 * - 2 exercise widgets (astro-island components from EXERCISE_COMPONENTS set)
 * - exactly 1 RetrievalDrawer island
 * - ≤5 astro-island total (2 exercises = 1 retrieval + 1 other; well within cap)
 */
function topicSkeleton(opts: Partial<Record<string, boolean | number>> = {}): string {
  const has = (k: string) => opts[k] !== false;
  const retrieval = opts["retrievalCount"] as number | undefined;
  const extraExercises = opts["extraExercises"] as number | undefined;
  const retrievalIslands = retrieval !== undefined ? retrieval : 1;
  const exerciseIslands = extraExercises !== undefined ? extraExercises : 1; // + 1 RetrievalDrawer = 2 total
  const extraIslands = opts["extraIslands"] as number | undefined;

  const retrievalHtml = Array.from({ length: retrievalIslands }, () =>
    `<astro-island component-url="/dist/RetrievalDrawer.abc123.js"></astro-island>`
  ).join("\n");

  const exerciseHtml = Array.from({ length: exerciseIslands }, () =>
    `<astro-island component-url="/dist/FadedExample.abc123.js"></astro-island>`
  ).join("\n");

  const extraIslandHtml = extraIslands
    ? Array.from({ length: extraIslands }, () =>
        `<astro-island component-url="/dist/Other.abc123.js"></astro-island>`
      ).join("\n")
    : "";

  return [
    `<article data-lesson-type="topic">`,
    has("hook") ? `<div data-lesson-section="hook"></div>` : "",
    has("crux") ? `<div data-lesson-section="crux"></div>` : "",
    has("explanation") ? `<div data-lesson-section="explanation"></div>` : "",
    has("visual") ? `<div data-lesson-visual></div>` : "",
    has("retrieval") ? retrievalHtml : "",
    has("exercises") ? exerciseHtml : "",
    has("key-takeaway") ? `<div data-lesson-section="key-takeaway"></div>` : "",
    has("recap") ? `<div data-lesson-section="recap"></div>` : "",
    extraIslandHtml,
    `<footer>Sources <a href="https://example.com">x</a></footer>`,
    `</article>`,
  ].join("\n");
}

describe("checkLessonRules — topic lessonType", () => {
  test("a complete topic lesson passes", () => {
    expect(checkLessonRules(topicSkeleton(), TOPIC_PATH)).toEqual([]);
  });

  test("flags missing hook section", () => {
    const errs = checkLessonRules(topicSkeleton({ hook: false }), TOPIC_PATH);
    expect(errs.some((e) => /hook/.test(e))).toBe(true);
  });

  test("flags missing crux section", () => {
    const errs = checkLessonRules(topicSkeleton({ crux: false }), TOPIC_PATH);
    expect(errs.some((e) => /crux/.test(e))).toBe(true);
  });

  test("flags missing explanation section", () => {
    const errs = checkLessonRules(topicSkeleton({ explanation: false }), TOPIC_PATH);
    expect(errs.some((e) => /explanation/.test(e))).toBe(true);
  });

  test("flags missing key-takeaway section", () => {
    const errs = checkLessonRules(topicSkeleton({ "key-takeaway": false }), TOPIC_PATH);
    expect(errs.some((e) => /key-takeaway/.test(e))).toBe(true);
  });

  test("flags missing recap section", () => {
    const errs = checkLessonRules(topicSkeleton({ recap: false }), TOPIC_PATH);
    expect(errs.some((e) => /recap/.test(e))).toBe(true);
  });

  test("flags no visual widget", () => {
    const errs = checkLessonRules(topicSkeleton({ visual: false }), TOPIC_PATH);
    expect(errs.some((e) => /visual/.test(e))).toBe(true);
  });

  test("flags fewer than 2 exercise widgets", () => {
    // Only 1 RetrievalDrawer, 0 other exercise widgets = 1 total, below the minimum 2
    const errs = checkLessonRules(topicSkeleton({ exercises: false }), TOPIC_PATH);
    expect(errs.some((e) => /exercise/.test(e))).toBe(true);
  });

  test("flags zero RetrievalDrawers (requires exactly 1)", () => {
    const errs = checkLessonRules(topicSkeleton({ retrieval: false }), TOPIC_PATH);
    expect(errs.some((e) => /RetrievalDrawer/.test(e))).toBe(true);
  });

  test("flags more than 1 RetrievalDrawer", () => {
    const errs = checkLessonRules(topicSkeleton({ retrievalCount: 2 }), TOPIC_PATH);
    expect(errs.some((e) => /RetrievalDrawer/.test(e))).toBe(true);
  });

  test("flags more than 5 hydration islands", () => {
    // 1 retrieval + 1 exercise + 6 extra = 8 islands total → over cap
    const errs = checkLessonRules(topicSkeleton({ extraIslands: 6 }), TOPIC_PATH);
    expect(errs.some((e) => /hydration/.test(e))).toBe(true);
  });

  test("sections must be in order: hook before crux before explanation before key-takeaway before recap", () => {
    const html = [
      `<article data-lesson-type="topic">`,
      `<div data-lesson-section="recap"></div>`,
      `<div data-lesson-section="hook"></div>`,
      `<div data-lesson-section="crux"></div>`,
      `<div data-lesson-section="explanation"></div>`,
      `<div data-lesson-visual></div>`,
      `<astro-island component-url="/dist/RetrievalDrawer.abc123.js"></astro-island>`,
      `<astro-island component-url="/dist/FadedExample.abc123.js"></astro-island>`,
      `<div data-lesson-section="key-takeaway"></div>`,
      `<footer>Sources <a href="https://example.com">x</a></footer>`,
      `</article>`,
    ].join("\n");
    const errs = checkLessonRules(html, TOPIC_PATH);
    expect(errs.some((e) => /before/.test(e))).toBe(true);
  });
});
