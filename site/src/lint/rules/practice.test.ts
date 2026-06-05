import { describe, expect, test } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  checkPracticeParity,
  checkPracticeLessonKey,
  checkPracticeCount,
  checkPracticeSandboxBudget,
  checkPracticeReview,
  checkPracticeDebug,
} from "./practice";

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "practice-"));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}

async function lesson(root: string, lang: string, key: string) {
  const dir = join(root, "content/lessons", lang, key);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"), `---\nlang: ${lang}\nstatus: ready\n---\nx\n`);
}

async function practiceFile(root: string, relPath: string, data: unknown) {
  const dir = join(root, "content/practice", relPath.split("/").slice(0, -1).join("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(join(root, "content/practice", relPath), JSON.stringify(data));
}

const goodTask = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "T", ru: "Т" }, prompt: { en: "P", ru: "П" },
  scenario: { en: "S", ru: "С" }, reveal: { en: "R", ru: "Р" },
};

describe("checkPracticeParity", () => {
  test("flags a BiText with whitespace-only ru", async () => {
    await withRoot(async (root) => {
      const t = { ...goodTask, title: { en: "Title", ru: "   " } };
      await practiceFile(root, "databases/03-execution-plans/03-join-algorithms.json",
        { lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.length).toBeGreaterThan(0);
    });
  });
  test("flags an untranslated prose field (en === ru, long)", async () => {
    await withRoot(async (root) => {
      const longSame = "This is an untranslated long prose sentence that exceeds the threshold.";
      const t = { ...goodTask, prompt: { en: longSame, ru: longSame } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.some((e) => /untranslated/.test(e))).toBe(true);
    });
  });
  test("passes a clean bilingual file", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [goodTask] });
      expect(await checkPracticeParity(root)).toEqual([]);
    });
  });
  test("does not flag an identical evidence field (machine output is language-neutral)", async () => {
    await withRoot(async (root) => {
      const plan = "Hash Join (cost=... rows=120) (actual rows=480000 loops=1) Seq Scan on big_table";
      const t = { ...goodTask, type: "diagnose", evidence: { en: plan, ru: plan },
        grading: { mode: "blanks", blanks: [{ id: "b1", accept: ["x"] }] } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.some((e) => /untranslated/.test(e))).toBe(false);
    });
  });
  test("still flags whitespace-only evidence", async () => {
    await withRoot(async (root) => {
      const t = { ...goodTask, type: "diagnose", evidence: { en: "   ", ru: "x" } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [t] });
      const errs = await checkPracticeParity(root);
      expect(errs.some((e) => /whitespace-only/.test(e))).toBe(true);
    });
  });
});

describe("checkPracticeLessonKey", () => {
  test("flags a lessonKey with no matching lesson", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [goodTask] });
      const errs = await checkPracticeLessonKey(root);
      expect(errs.some((e) => /a\/b\/c/.test(e))).toBe(true);
    });
  });
  test("passes when both EN and RU lessons exist", async () => {
    await withRoot(async (root) => {
      await lesson(root, "en", "databases/03-execution-plans/03-join-algorithms");
      await lesson(root, "ru", "databases/03-execution-plans/03-join-algorithms");
      await practiceFile(root, "databases/03-execution-plans/03-join-algorithms.json",
        { lessonKey: "databases/03-execution-plans/03-join-algorithms", track: "databases", tasks: [goodTask] });
      expect(await checkPracticeLessonKey(root)).toEqual([]);
    });
  });
  test("flags an unknown parametric component name", async () => {
    await withRoot(async (root) => {
      await lesson(root, "en", "a/b/c");
      await lesson(root, "ru", "a/b/c");
      const sandbox = { id: "s1", type: "sandbox", difficulty: "apply", estMin: 5,
        title: { en: "S", ru: "С" }, prompt: { en: "P", ru: "П" },
        runtime: "parametric", parametric: { component: "NoSuchThing" } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "databases", tasks: [sandbox] });
      const errs = await checkPracticeLessonKey(root);
      expect(errs.some((e) => /NoSuchThing/.test(e))).toBe(true);
    });
  });
});

describe("checkPracticeCount", () => {
  test("warns (not errors) for a ready lesson with no practice file in a non-required track", async () => {
    await withRoot(async (root) => {
      // typescript is not in PRACTICE_REQUIRED_TRACKS, so a missing practice file warns rather than errors
      await lesson(root, "en", "typescript/03-generics/01-generic-functions");
      await lesson(root, "ru", "typescript/03-generics/01-generic-functions");
      const { errors, warnings } = await checkPracticeCount(root);
      expect(errors).toEqual([]);
      expect(warnings.some((w) => /01-generic-functions/.test(w))).toBe(true);
    });
  });
});

const goodReview = {
  id: "rev1", type: "review", difficulty: "apply", estMin: 7,
  title: { en: "R", ru: "Р" }, prompt: { en: "P", ru: "П" },
  diff: { lang: "js", code: "function f(cb){ if (e) cb(e); cb(null, d); }" },
  findings: [{ id: "f1", label: { en: "Bug", ru: "Баг" }, severity: "bug", explanation: { en: "no return", ru: "нет return" }, planted: true }],
};

describe("checkPracticeReview", () => {
  test("flags a review task with zero findings", async () => {
    await withRoot(async (root) => {
      const t = { ...goodReview, findings: [] };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [t] });
      const errs = await checkPracticeReview(root);
      expect(errs.length).toBeGreaterThan(0);
    });
  });
  test("passes a review task with at least one finding", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [goodReview] });
      expect(await checkPracticeReview(root)).toEqual([]);
    });
  });
  test("ignores non-review tasks", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [goodTask] });
      expect(await checkPracticeReview(root)).toEqual([]);
    });
  });
});

const goodDebug = {
  id: "dbg1", type: "debug", difficulty: "apply", estMin: 8,
  title: { en: "Fix it", ru: "Почини" }, prompt: { en: "P", ru: "П" },
  starter: "for (var i = 0; i < 3; i++) {}",
  verify: "if (false) throw 0; console.log('__SECRET_ASSERT__');",
  check: { kind: "stdout-contains", value: "__SECRET_ASSERT__" },
  evidence: { en: "[3,3,3]", ru: "[3,3,3]" },
  hints: [{ en: "var vs let", ru: "var против let" }],
  reveal: { en: "Use let for block scope", ru: "Используй let для блочной области" },
};

describe("checkPracticeDebug", () => {
  test("passes a clean debug task", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [goodDebug] });
      expect(await checkPracticeDebug(root)).toEqual([]);
    });
  });
  test("flags a debug task with an empty verify", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [{ ...goodDebug, verify: "" }] });
      expect((await checkPracticeDebug(root)).length).toBeGreaterThan(0);
    });
  });
  test("flags the hidden verify leaking into a learner-visible field (reveal)", async () => {
    await withRoot(async (root) => {
      const leak = { ...goodDebug, reveal: { en: `Solution: ${goodDebug.verify}`, ru: "решение" } };
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [leak] });
      expect((await checkPracticeDebug(root)).some((e) => /verify|leak/i.test(e))).toBe(true);
    });
  });
  test("ignores non-debug tasks", async () => {
    await withRoot(async (root) => {
      await practiceFile(root, "a/b/c.json", { lessonKey: "a/b/c", track: "node", tasks: [goodTask] });
      expect(await checkPracticeDebug(root)).toEqual([]);
    });
  });
});

describe("checkPracticeSandboxBudget", () => {
  const LESSON = "/x/dist/en/learn/databases/03-execution-plans/03-join-algorithms/index.html";
  test("passes a single client:visible practice island", () => {
    const html = `<astro-island component-url="/_astro/PracticeSection.abc.js" client="visible"></astro-island><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON)).toEqual([]);
  });
  test("flags two practice-layer markers", () => {
    const html = `<section data-practice-layer></section><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON).some((e) => /at most one/.test(e))).toBe(true);
  });
  test("flags a client:load practice island", () => {
    const html = `<astro-island component-url="/_astro/PracticeSection.abc.js" client="load"></astro-island><section data-practice-layer></section>`;
    expect(checkPracticeSandboxBudget(html, LESSON).some((e) => /eager/.test(e))).toBe(true);
  });
  test("ignores non-lesson pages", () => {
    expect(checkPracticeSandboxBudget(`<section data-practice-layer></section><section data-practice-layer></section>`, "/x/dist/en/index.html")).toEqual([]);
  });
});
