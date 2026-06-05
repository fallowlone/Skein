import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkCapstones } from "./capstones";

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
});
