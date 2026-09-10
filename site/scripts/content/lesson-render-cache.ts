import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileLessonRenderTree,
  LESSON_RENDER_TREE_FORMAT,
  renderTreeCompilerHash,
  type LessonRenderTreeArtifact,
} from "./lesson-render-tree";

export interface CachedLessonRenderTree {
  artifact: LessonRenderTreeArtifact;
  cacheHit: boolean;
  path: string;
}

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function dependenciesMatch(
  artifact: LessonRenderTreeArtifact,
  sourcePath: string,
): Promise<boolean> {
  for (const [source, expected] of Object.entries(artifact.dependencies ?? {})) {
    if (!source.endsWith(".svg?raw") || !source.startsWith(".")) return false;
    try {
      const raw = await readFile(resolve(dirname(sourcePath), source.slice(0, -"?raw".length)), "utf8");
      if (sha256(raw) !== expected) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function getOrCompileLessonRenderTree(
  sourcePath: string,
  cacheDir = join(siteRoot, "build-cache", "lesson-render-trees"),
): Promise<CachedLessonRenderTree> {
  const raw = await readFile(sourcePath, "utf8");
  const sourceHash = sha256(raw);
  const compilerHash = await renderTreeCompilerHash();
  const cachePath = join(cacheDir, `${sourceHash}-${compilerHash}.json`);

  try {
    const cached = JSON.parse(await readFile(cachePath, "utf8")) as LessonRenderTreeArtifact;
    if (
      cached.format === LESSON_RENDER_TREE_FORMAT &&
      cached.sourceHash === sourceHash &&
      cached.compilerHash === compilerHash &&
      typeof cached.artifactHash === "string" &&
      await dependenciesMatch(cached, sourcePath)
    ) {
      return { artifact: cached, cacheHit: true, path: cachePath };
    }
  } catch {
    // Cache miss/corruption falls through to deterministic recompilation.
  }

  const artifact = await compileLessonRenderTree(raw, sourcePath, compilerHash);
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(artifact)}\n`, "utf8");
  return { artifact, cacheHit: false, path: cachePath };
}
