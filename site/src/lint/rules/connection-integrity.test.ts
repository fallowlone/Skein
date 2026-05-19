import { describe, expect, test } from "vitest";
import { checkConnectionIntegrity } from "./connection-integrity";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Write a minimal lesson MDX at <root>/content/lessons/<lang>/<track>/<unit>/<slug>/index.mdx */
async function fixture(
  root: string,
  lang: string,
  track: string,
  unit: string,
  slug: string,
  extra = ""
) {
  const dir = join(root, "content/lessons", lang, track, unit, slug);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "index.mdx"),
    `---\nslug: ${slug}\nlang: ${lang}\ntrack: ${track}\nunit: ${unit}\n${extra}\n---\nbody\n`
  );
}

describe("checkConnectionIntegrity", () => {
  test("returns no errors when there are no lessons", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await mkdir(join(r, "content/lessons"), { recursive: true });
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("returns no errors when prereqs and deepensInto are absent", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm");
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("passes a fully-qualified prereq that resolves to an existing lesson", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(r, "en", "math", "01-numbers", "01-counting");
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `prereqs: ["math/01-numbers/01-counting"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("flags a fully-qualified prereq that does not resolve", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `prereqs: ["math/01-numbers/99-missing"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /99-missing/.test(e))).toBe(true);
  });

  test("passes a bare-slug prereq that resolves within the same track+unit", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm");
    await fixture(
      r, "en", "algorithms", "01-intro", "02-next-lesson",
      `prereqs: ["01-what-is-an-algorithm"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("flags a bare-slug prereq that does not resolve in the same track+unit", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(
      r, "en", "algorithms", "01-intro", "02-next-lesson",
      `prereqs: ["99-missing"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /99-missing/.test(e))).toBe(true);
  });

  test("passes a fully-qualified deepensInto ref that resolves", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(r, "en", "algorithms", "02-sorting", "01-bubble-sort");
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `deepensInto: ["algorithms/02-sorting/01-bubble-sort"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("flags a fully-qualified deepensInto ref that does not resolve", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `deepensInto: ["algorithms/02-sorting/99-missing"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /99-missing/.test(e))).toBe(true);
  });

  test("flags a bare-slug deepensInto ref that does not resolve in the same track+unit", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `deepensInto: ["99-missing-lesson"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.some((e) => /99-missing-lesson/.test(e))).toBe(true);
  });

  test("only checks EN files (RU duplicates same refs — avoids double reporting)", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    // RU file with a dangling ref — should NOT produce an error
    await fixture(
      r, "ru", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `prereqs: ["math/01-numbers/99-missing"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("handles multiple refs in the same field, flags only the missing ones", async () => {
    const r = await mkdtemp(join(tmpdir(), "ci-"));
    await fixture(r, "en", "math", "01-numbers", "01-counting");
    await fixture(
      r, "en", "algorithms", "01-intro", "01-what-is-an-algorithm",
      `prereqs: ["math/01-numbers/01-counting", "math/01-numbers/99-missing"]`
    );
    const errs = await checkConnectionIntegrity(r);
    await rm(r, { recursive: true, force: true });
    expect(errs.length).toBe(1);
    expect(errs.some((e) => /99-missing/.test(e))).toBe(true);
  });
});
