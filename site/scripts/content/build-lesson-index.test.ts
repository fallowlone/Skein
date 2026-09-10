import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { buildLessonIndex } from "./build-lesson-index.ts";

describe("buildLessonIndex", () => {
  it("materializes lightweight localized metadata and glossary keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "skein-lesson-index-"));
    const dir = join(root, "src/content/lessons/en/test/01-unit/01-lesson");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.mdx"), `---
lang: en
track: test
unit: 01-unit
slug: 01-lesson
status: ready
order: 1
title: One
summary: Summary
estMin: 12
prereqs: [00-prereq]
---
<Term k="tcp">TCP</Term>
<Term k="tcp">again</Term>
`);

    await expect(buildLessonIndex(root)).resolves.toEqual({
      "en/test/01-unit/01-lesson": {
        lang: "en",
        track: "test",
        unit: "01-unit",
        slug: "01-lesson",
        status: "ready",
        order: 1,
        title: "One",
        summary: "Summary",
        estMin: 12,
        prereqs: ["00-prereq"],
        terms: ["tcp"],
      },
    });
  });
});
