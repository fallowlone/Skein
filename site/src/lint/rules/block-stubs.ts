import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { EXERCISE_COMPONENTS } from "./exercise-components";

/**
 * Quiz/project assessment blocks (slug `quiz-*` or `project`) may exist as
 * skeleton stubs while authoring is in progress — those carry `status: stub`.
 * But once a block is promoted to `status: ready` it MUST contain a real
 * exercise component and MUST NOT contain the generator boilerplate. This
 * guards against regressing an authored block back to a placeholder, or
 * shipping an empty block to readers (GlobalSearch only surfaces `ready`).
 *
 * Source-level rule (runs over src/, not dist/) because the dist HTML path
 * parser used by lessons.ts does not match unit-nested lesson pages.
 */
// The generator stub Hook reads: "This is a quiz-choice for the … unit."
const BOILERPLATE_RE = /This is a (?:quiz|project)[a-z-]* for the /;
// A real assessment block must use ProjectBrief or any registered exercise widget.
const COMPONENT_RE = new RegExp(
  `<(ProjectBrief|${[...EXERCISE_COMPONENTS].join("|")})\\b`
);

function isBlockDir(name: string): boolean {
  return name.startsWith("quiz-") || name === "project";
}

async function findBlockIndexes(lessonsRoot: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, depthFromRoot: number) {
    let items;
    try {
      items = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const it of items) {
      const p = join(dir, it.name);
      if (!it.isDirectory()) continue;
      if (isBlockDir(it.name)) {
        out.push(join(p, "index.mdx"));
      } else {
        await walk(p, depthFromRoot + 1);
      }
    }
  }
  await walk(lessonsRoot, 0);
  return out;
}

function statusOf(src: string): string | null {
  const m = src.match(/(?:^|\n)status:\s*([a-z]+)/);
  return m ? m[1] : null;
}

export async function checkBlockStubs(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsRoot = join(siteSrc, "content", "lessons");
  const indexes = await findBlockIndexes(lessonsRoot);
  for (const file of indexes) {
    let src: string;
    try {
      src = await readFile(file, "utf8");
    } catch {
      continue;
    }
    if (statusOf(src) !== "ready") continue;
    if (BOILERPLATE_RE.test(src)) {
      errs.push(`${file}: quiz/project block is status:ready but still contains stub boilerplate ("This is a … for the … unit")`);
    }
    if (!COMPONENT_RE.test(src)) {
      errs.push(`${file}: quiz/project block is status:ready but has no Quiz/RFCQuiz/ProjectBrief component`);
    }
  }
  return errs;
}
