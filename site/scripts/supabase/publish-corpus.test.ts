import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lessonRow, sha256 } from "./corpus";
import { attachLessonRenderTrees } from "./publish-corpus";

describe("lesson publish corpus", () => {
  it("keeps publish hashes stable on cache hits and changes them with SVG dependencies", async () => {
    const site = await mkdtemp(join(tmpdir(), "lesson-publish-"));
    const rel = "src/content/lessons/en/apis/01-http/01-cached/index.mdx";
    const lessonDir = join(site, "src/content/lessons/en/apis/01-http/01-cached");
    const cacheDir = join(site, "cache");
    await mkdir(lessonDir, { recursive: true });
    const raw = `---
lang: en
track: apis
unit: 01-http
slug: 01-cached
title: Cached
---
import Infographic from "~/components/diagram/Infographic.astro";
import diagram from "./diagram.svg?raw";

<Infographic svg={diagram} label="diagram" />
`;
    await writeFile(join(site, rel), raw);
    await writeFile(join(lessonDir, "diagram.svg"), "<svg>one</svg>");
    const row = lessonRow(raw, rel, sha256(raw));

    const first = await attachLessonRenderTrees([row], site, cacheDir);
    const firstHash = row.hash;
    expect(first).toEqual({ lessons: 1, cacheHits: 0, cacheMisses: 1 });
    expect(row.row.render_tree).toMatchObject({ format: "lesson-render-tree-v1" });

    const second = await attachLessonRenderTrees([row], site, cacheDir);
    expect(second).toEqual({ lessons: 1, cacheHits: 1, cacheMisses: 0 });
    expect(row.hash).toBe(firstHash);

    await writeFile(join(lessonDir, "diagram.svg"), "<svg>two</svg>");
    const third = await attachLessonRenderTrees([row], site, cacheDir);
    expect(third).toEqual({ lessons: 1, cacheHits: 0, cacheMisses: 1 });
    expect(row.hash).not.toBe(firstHash);
  });
});
