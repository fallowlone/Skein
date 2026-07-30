import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCapstones, checkWorkbenchCoherence } from "./capstones";

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "cap-"));
  try { await fn(root); } finally { await rm(root, { recursive: true, force: true }); }
}
async function project(root: string, name: string, data: unknown) {
  const dir = join(root, "content/projects");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), JSON.stringify(data));
}

const ms = (id: string) => ({
  id,
  title: { en: `Title ${id}`, ru: `Заголовок ${id}` },
  goal: { en: `Implement stage ${id} fully`, ru: `Реализуй этап ${id} полностью` },
  definitionOfDone: [{ en: "one done criterion", ru: "один критерий готовности" }],
});
const proj = (milestones: unknown[]) => ({ slug: "p", milestones });

describe("checkCapstones", () => {
  it("passes a clean guided project", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", proj([ms("m1"), ms("m2")]));
      expect((await checkCapstones(root)).errors).toEqual([]);
    });
  });

  it("flags a milestone with a whitespace-only ru title", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", proj([{ ...ms("m1"), title: { en: "X", ru: "  " } }, ms("m2")]));
      expect((await checkCapstones(root)).errors.length).toBeGreaterThan(0);
    });
  });

  it("flags an en===ru goal over the length threshold (untranslated)", async () => {
    await withRoot(async (root) => {
      const same = "This goal sentence is long enough to exceed the threshold.";
      await project(root, "p.json", proj([{ ...ms("m1"), goal: { en: same, ru: same } }, ms("m2")]));
      expect((await checkCapstones(root)).errors.some((e) => /untranslated/.test(e))).toBe(true);
    });
  });

  it("flags a definitionOfDone item that is untranslated", async () => {
    await withRoot(async (root) => {
      const same = "Both languages share this identical long definition of done item.";
      await project(root, "p.json", proj([{ ...ms("m1"), definitionOfDone: [{ en: same, ru: same }] }, ms("m2")]));
      expect((await checkCapstones(root)).errors.some((e) => /untranslated/.test(e))).toBe(true);
    });
  });

  it("flags duplicate milestone ids", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", proj([ms("m1"), ms("m1")]));
      expect((await checkCapstones(root)).errors.some((e) => /duplicat/i.test(e))).toBe(true);
    });
  });

  it("skips legacy plain {en,ru} milestones (back-compat)", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", proj([{ en: "a", ru: "а" }, { en: "b", ru: "б" }]));
      expect((await checkCapstones(root)).errors).toEqual([]);
    });
  });

  it("warns on a malformed feedsFrom key", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", proj([{ ...ms("m1"), feedsFrom: ["not-a-key"] }, ms("m2")]));
      expect((await checkCapstones(root)).warnings.some((w) => /feedsFrom/.test(w))).toBe(true);
    });
  });

  it("flags an untranslated rubric cell (en===ru, prose)", async () => {
    await withRoot(async (root) => {
      const same = "This rubric cell is identical in both languages and long enough.";
      await project(root, "p.json", {
        slug: "p", milestones: [ms("m1"), ms("m2")],
        rubric: [{ dimension: { en: "Correctness of refill", ru: "Корректность пополнения" },
          junior: { en: same, ru: same }, mid: { en: "m", ru: "м" }, senior: { en: "s", ru: "с" } }],
      });
      expect((await checkCapstones(root)).errors.some((e) => /rubric.*untranslated/.test(e))).toBe(true);
    });
  });

  it("passes a fully-translated rubric + reference", async () => {
    await withRoot(async (root) => {
      await project(root, "p.json", {
        slug: "p", milestones: [ms("m1"), ms("m2")],
        rubric: [{ dimension: { en: "Correctness of refill", ru: "Корректность пополнения" },
          junior: { en: "passes the happy path", ru: "проходит счастливый путь" },
          mid: { en: "handles the cap and refill", ru: "учитывает лимит и пополнение" },
          senior: { en: "handles contention and abuse", ru: "учитывает гонки и злоупотребление" } }],
        reference: [{ en: "The token bucket fits because bursts are cheap to allow.",
          ru: "Token bucket подходит, потому что всплески дёшево разрешать." }],
      });
      expect((await checkCapstones(root)).errors).toEqual([]);
    });
  });
});

describe("checkWorkbenchCoherence", () => {
  // Each stack's runner looks in a different place: bun-ts under scaffold/test/,
  // python and go at the scaffold root (unittest discovery / `go test ./...`).
  const SUITE_FILE: Record<string, { dir: string; name: string }> = {
    "bun-ts": { dir: "test", name: "x.test.ts" },
    python: { dir: "", name: "test_x.py" },
    go: { dir: "", name: "x_test.go" },
  };

  async function wb(root: string, slug: string, opts: { stack?: string; scaffold?: boolean; solution?: boolean; test?: boolean }) {
    const base = join(root, slug);
    const stack = opts.stack ?? "bun-ts";
    await mkdir(base, { recursive: true });
    await writeFile(join(base, "manifest.json"), JSON.stringify({ stack, test: "bun test" }));
    if (opts.scaffold !== false) {
      const suite = SUITE_FILE[stack] ?? SUITE_FILE["bun-ts"];
      const dir = suite.dir ? join(base, "scaffold", suite.dir) : join(base, "scaffold");
      await mkdir(dir, { recursive: true });
      if (opts.test !== false) await writeFile(join(dir, suite.name), "// test");
    }
    if (opts.solution !== false) await mkdir(join(base, "solution"), { recursive: true });
  }

  it("passes a complete workbench", async () => {
    const root = await mkdtemp(join(tmpdir(), "wbc-"));
    try {
      await wb(root, "p", {});
      const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "p", workbench: true } }], root);
      expect(errs).toEqual([]);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("flags workbench:true with no directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "wbc-"));
    try {
      const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "missing", workbench: true } }], root);
      expect(errs.some((e) => /missing/.test(e))).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("flags a missing solution dir and a missing test file", async () => {
    const root = await mkdtemp(join(tmpdir(), "wbc-"));
    try {
      await wb(root, "p", { solution: false, test: false });
      const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "p", workbench: true } }], root);
      expect(errs.some((e) => /solution/.test(e))).toBe(true);
      expect(errs.some((e) => /no \*\.test\.ts/.test(e))).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("flags an orphan workbench dir (no claiming project)", async () => {
    const root = await mkdtemp(join(tmpdir(), "wbc-"));
    try {
      await wb(root, "orphan", {});
      const errs = await checkWorkbenchCoherence([], root);
      expect(errs.some((e) => /orphan/.test(e))).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("flags a stack no runner supports", async () => {
    const root = await mkdtemp(join(tmpdir(), "wbc-"));
    try {
      await wb(root, "p", { stack: "rust" });
      const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "p", workbench: true } }], root);
      expect(errs.some((e) => /invalid stack/.test(e))).toBe(true);
    } finally { await rm(root, { recursive: true, force: true }); }
  });

  it("accepts the python and go stacks with their own suite layouts", async () => {
    for (const stack of ["python", "go"]) {
      const root = await mkdtemp(join(tmpdir(), "wbc-"));
      try {
        await wb(root, "p", { stack });
        const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "p", workbench: true } }], root);
        expect(errs).toEqual([]);
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });

  it("flags a python or go workbench whose suite file is missing", async () => {
    for (const [stack, label] of [["python", /test_\*\.py/], ["go", /\*_test\.go/]] as const) {
      const root = await mkdtemp(join(tmpdir(), "wbc-"));
      try {
        await wb(root, "p", { stack, test: false });
        const errs = await checkWorkbenchCoherence([{ file: "p.json", data: { slug: "p", workbench: true } }], root);
        expect(errs.some((e) => label.test(e))).toBe(true);
      } finally { await rm(root, { recursive: true, force: true }); }
    }
  });
});
