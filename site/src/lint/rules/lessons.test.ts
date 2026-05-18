import { describe, expect, test } from "vitest";
import { checkLessonRules, checkLessonParity, checkMathPrereqs } from "./lessons";
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

async function lessonFixture(root: string, lang: string, status: string) {
  const dir = join(root, "content/lessons", lang, "math/01-numbers/01-counting");
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "index.mdx"),
    `---\nslug: 01-counting\nlang: ${lang}\ntrack: math\nunit: 01-numbers\norder: 1\nstatus: ${status}\nconcepts: ["natural-number"]\n---\nbody\n`
  );
}

describe("checkLessonParity", () => {
  test("flags an EN-ready lesson with no RU twin", async () => {
    const root = await mkdtemp(join(tmpdir(), "lint-"));
    await lessonFixture(root, "en", "ready");
    const errs = await checkLessonParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs.some((e) => /missing RU/.test(e))).toBe(true);
  });

  test("passes when both EN and RU ready lessons exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "lint-"));
    await lessonFixture(root, "en", "ready");
    await lessonFixture(root, "ru", "ready");
    const errs = await checkLessonParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
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
