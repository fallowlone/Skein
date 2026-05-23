import { describe, expect, test } from "vitest";
import { checkI18nParity } from "./i18n-parity";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function lessonFixture(root: string, lang: string, status: string) {
  const dir = join(root, "content/lessons", lang, "databases/03-execution-plans/03-join-algorithms");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.mdx"),
    `---\nslug: 03-join-algorithms\nlang: ${lang}\ntrack: databases\nunit: 03-execution-plans\norder: 3\nstatus: ${status}\n---\nbody\n`);
}

describe("checkI18nParity (lessons)", () => {
  test("flags an EN-ready lesson with no RU twin", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "ready");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs.some((e) => /missing RU/.test(e))).toBe(true);
  });

  test("passes when both EN and RU ready twins exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "ready");
    await lessonFixture(root, "ru", "ready");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });

  test("ignores non-ready lessons", async () => {
    const root = await mkdtemp(join(tmpdir(), "i18n-"));
    await lessonFixture(root, "en", "draft");
    const errs = await checkI18nParity(root);
    await rm(root, { recursive: true, force: true });
    expect(errs).toEqual([]);
  });
});
