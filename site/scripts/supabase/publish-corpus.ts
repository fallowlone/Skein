import { join } from "node:path";
import { getOrCompileLessonRenderTree } from "../content/lesson-render-cache";
import { materialize, sha256, type CourseRow } from "./corpus";

export interface LessonRenderPublishStats {
  lessons: number;
  cacheHits: number;
  cacheMisses: number;
}

export async function attachLessonRenderTrees(
  rows: CourseRow[],
  siteRoot: string,
  cacheDir?: string,
): Promise<LessonRenderPublishStats> {
  const stats: LessonRenderPublishStats = { lessons: 0, cacheHits: 0, cacheMisses: 0 };
  for (const row of rows) {
    if (row.kind !== "lessons") continue;
    if (!row.sourceRel) throw new Error(`${row.ledgerKey}: lesson source path is missing`);

    const result = await getOrCompileLessonRenderTree(
      join(siteRoot, row.sourceRel),
      cacheDir,
    );
    stats.lessons += 1;
    if (result.cacheHit) stats.cacheHits += 1;
    else stats.cacheMisses += 1;

    const sourceHash = row.sourceHash ?? row.hash;
    const publishHash = sha256(JSON.stringify({
      format: "lesson-publish-v1",
      sourceHash,
      renderHash: result.artifact.artifactHash,
    }));
    row.hash = publishHash;
    row.row.content_hash = publishHash;
    row.row.render_hash = result.artifact.artifactHash;
    row.row.render_tree = result.artifact;
  }
  return stats;
}

export async function materializePublishedCorpus(
  siteRoot: string,
  options: { includeLessonRenderTrees?: boolean; cacheDir?: string } = {},
): Promise<{ rows: CourseRow[]; render: LessonRenderPublishStats }> {
  const rows = await materialize(siteRoot);
  const render = options.includeLessonRenderTrees === false
    ? { lessons: 0, cacheHits: 0, cacheMisses: 0 }
    : await attachLessonRenderTrees(rows, siteRoot, options.cacheDir);
  return { rows, render };
}
