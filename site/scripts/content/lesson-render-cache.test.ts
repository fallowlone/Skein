import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getOrCompileLessonRenderTree } from "./lesson-render-cache";

describe("lesson render tree cache", () => {
  it("hits unchanged content and invalidates when a raw SVG dependency changes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lesson-render-cache-"));
    const cache = join(dir, "cache");
    const lessonDir = join(dir, "lesson");
    await mkdir(lessonDir, { recursive: true });
    const sourcePath = join(lessonDir, "index.mdx");
    const svgPath = join(lessonDir, "diagram.svg");
    const raw = `---
lang: en
track: apis
unit: 01-http
slug: cached
title: Cached
---
import Infographic from "~/components/diagram/Infographic.astro";
import diagram from "./diagram.svg?raw";

<Infographic svg={diagram} label="diagram" />
`;
    await writeFile(sourcePath, raw);
    await writeFile(svgPath, "<svg><path d=\"M0 0\"/></svg>");

    const first = await getOrCompileLessonRenderTree(sourcePath, cache);
    const second = await getOrCompileLessonRenderTree(sourcePath, cache);
    expect(first.cacheHit).toBe(false);
    expect(second.cacheHit).toBe(true);
    expect(second.artifact.artifactHash).toBe(first.artifact.artifactHash);

    await writeFile(svgPath, "<svg><path d=\"M1 1\"/></svg>");
    const third = await getOrCompileLessonRenderTree(sourcePath, cache);
    expect(third.cacheHit).toBe(false);
    expect(third.artifact.artifactHash).not.toBe(first.artifact.artifactHash);
  });
});
