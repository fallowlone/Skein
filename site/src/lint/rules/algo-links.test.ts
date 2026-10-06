import { describe, it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkAlgoLinks } from "./algo-links";

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "algo-links-"));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const lesson = (track: string, unit: string, slug: string, concepts: string[]) =>
  `---\ntrack: ${track}\nunit: ${unit}\nslug: ${slug}\nconcepts:\n${concepts.map((c) => `- ${c}`).join("\n")}\n---\nBody.\n`;

async function seed(root: string, curated: unknown) {
  await mkdir(join(root, "content/path"), { recursive: true });
  await writeFile(
    join(root, "content/path/unit-concepts.json"),
    JSON.stringify({
      "algorithms/u-a": { teaches: ["c1", "c2", "c3"] },
      "algorithms/u-empty": { teaches: [] },
      "backend/u1": { teaches: ["c1"] },
    }),
  );
  await writeFile(join(root, "content/path/algo-links.curated.json"), JSON.stringify(curated));
  await mkdir(join(root, "content/lessons/en/t1/u1/l1"), { recursive: true });
  await writeFile(join(root, "content/lessons/en/t1/u1/l1/index.mdx"), lesson("t1", "u1", "l1", ["c1", "c2", "c9"]));
}

describe("checkAlgoLinks", () => {
  it("passes a clean curated file", async () => {
    await withRoot(async (root) => {
      await seed(root, [{ algo: "algorithms/u-a", lesson: "t1/u1/l1", kind: "always" }]);
      expect((await checkAlgoLinks(root)).errors).toEqual([]);
    });
  });

  it("errors on unknown lesson", async () => {
    await withRoot(async (root) => {
      await seed(root, [{ algo: "algorithms/u-a", lesson: "t1/u1/nope", kind: "always" }]);
      const { errors } = await checkAlgoLinks(root);
      expect(errors.some((e) => /unknown lesson/.test(e))).toBe(true);
    });
  });

  it("errors on unknown algo unit", async () => {
    await withRoot(async (root) => {
      await seed(root, [{ algo: "algorithms/u-nope", lesson: "t1/u1/l1", kind: "never" }]);
      const { errors } = await checkAlgoLinks(root);
      expect(errors.some((e) => /unknown algo unit/.test(e))).toBe(true);
    });
  });

  it("errors on misspelled kind", async () => {
    await withRoot(async (root) => {
      await seed(root, [{ algo: "algorithms/u-a", lesson: "t1/u1/l1", kind: "sometimes" }]);
      const { errors } = await checkAlgoLinks(root);
      expect(errors.some((e) => /kind/.test(e))).toBe(true);
    });
  });

  it("warns on a zero-link algo unit", async () => {
    await withRoot(async (root) => {
      await seed(root, []);
      const { warnings } = await checkAlgoLinks(root);
      expect(warnings.some((w) => /zero-link/.test(w) && /u-empty/.test(w))).toBe(true);
    });
  });
});
