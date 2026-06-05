import type { AstroIntegration } from "astro";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTextBudgets } from "./rules/text-budgets";
import { checkHydrationBudget } from "./rules/hydration-budget";
import { checkSpiralCues } from "./rules/spiral-cues";
import { checkI18nParity } from "./rules/i18n-parity";
import { checkSources } from "./rules/sources";
import { checkReducedMotion } from "./rules/reduced-motion";
import { checkPersonas } from "./rules/personas";
import { checkLessonRules, checkMathPrereqs } from "./rules/lessons";
import { checkConnectionIntegrity } from "./rules/connection-integrity";
import { checkCjkLeak } from "./rules/cjk-leak";
import { checkPracticeParity, checkPracticeLessonKey, checkPracticeCount, checkPracticeReview, checkPracticeDebug, checkPracticeSandboxBudget } from "./rules/practice";
import { checkBlockStubs } from "./rules/block-stubs";
import { checkDrill } from "./rules/drill";
import { checkLab } from "./rules/lab";
import { checkCapstones } from "./rules/capstones";

async function walk(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (extname(i.name) === ".html") out.push(p);
  }
  return out;
}

/**
 * Lint the rendered site. `root` is the built `dist/` directory, `siteSrc` is
 * the `src/` directory. Writes `lint-report.json` into `root` and returns the
 * collected errors/warnings.
 *
 * This is invoked as a SEPARATE post-build process (`bun scripts/lint-dist.mjs`),
 * not inside the astro build. Running it in-process via `astro:build:done` made
 * it inherit the render's ~10GB retained heap; the extra lint allocations then
 * tipped the CI runner past its 16GB physical RAM and the kernel SIGKILL'd the
 * build mid-lint. As its own process it starts with a clean heap (the render
 * process has already exited and freed everything), so peak memory stays low.
 */
export async function runLint(root: string, siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const files = await walk(root);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Read + check every emitted HTML page. Reads are IO-bound, so a bounded
  // worker pool runs them concurrently while keeping output in file order
  // (deterministic lint-report.json). Serial awaits here dominated the
  // post-build phase once the site grew past a few thousand pages.
  const perFile: Array<{ e: string[]; w: string[] }> = new Array(files.length);
  let cursor = 0;
  const CONCURRENCY = 24;
  async function lintWorker() {
    for (;;) {
      const i = cursor++;
      if (i >= files.length) return;
      const f = files[i];
      const html = await readFile(f, "utf8");
      const e: string[] = [];
      const w: string[] = [];
      e.push(...checkTextBudgets(html, f));
      e.push(...checkHydrationBudget(html, f));
      w.push(...checkSpiralCues(html, f));
      e.push(...checkSources(html, f));
      e.push(...checkPersonas(html, f));
      e.push(...checkLessonRules(html, f));
      e.push(...checkPracticeSandboxBudget(html, f));
      perFile[i] = { e, w };
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, files.length) }, lintWorker),
  );
  for (const r of perFile) {
    if (!r) continue;
    errors.push(...r.e);
    warnings.push(...r.w);
  }

  // Source-level + global checks
  errors.push(...(await checkI18nParity(siteSrc)));
  errors.push(...(await checkCjkLeak(siteSrc)));
  errors.push(...(await checkMathPrereqs(siteSrc)));
  errors.push(...(await checkConnectionIntegrity(siteSrc)));
  errors.push(...(await checkReducedMotion(root)));
  errors.push(...(await checkPracticeParity(siteSrc)));
  errors.push(...(await checkPracticeLessonKey(siteSrc)));
  errors.push(...(await checkPracticeReview(siteSrc)));
  errors.push(...(await checkPracticeDebug(siteSrc)));
  errors.push(...(await checkBlockStubs(siteSrc)));
  const pc = await checkPracticeCount(siteSrc);
  errors.push(...pc.errors);
  warnings.push(...pc.warnings);
  const drillRes = await checkDrill(siteSrc);
  errors.push(...drillRes.errors);
  warnings.push(...drillRes.warnings);
  const labRes = await checkLab(siteSrc);
  errors.push(...labRes.errors);
  warnings.push(...labRes.warnings);
  const capRes = await checkCapstones(siteSrc);
  errors.push(...capRes.errors);
  warnings.push(...capRes.warnings);

  await writeFile(
    join(root, "lint-report.json"),
    JSON.stringify({ errors, warnings }, null, 2)
  );

  return { errors, warnings };
}

/**
 * Astro integration form, kept for local/dev `astro build` runs. NOTE: this is
 * intentionally NOT registered in astro.config.mjs — CI and `bun run build`
 * invoke `runLint` as a standalone post-build step instead (see the doc on
 * runLint for the memory reason). Register it only if you want in-process lint.
 */
export function lintCurriculum(): AstroIntegration {
  return {
    name: "lint-curriculum",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const siteSrc = fileURLToPath(new URL("../src/", dir));
        const { errors, warnings } = await runLint(root, siteSrc);
        if (errors.length) {
          logger.error(
            `lint failed with ${errors.length} errors:\n${errors.slice(0, 20).join("\n")}`
          );
          throw new Error(`lint: ${errors.length} errors`);
        }
        if (warnings.length) logger.warn(`lint: ${warnings.length} warnings (see lint-report.json)`);
      },
    },
  };
}
