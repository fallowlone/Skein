import { describe, expect, test } from "vitest";
import { checkLessonRules, checkLessonParity } from "./lessons";
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
