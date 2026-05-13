import type { AstroIntegration } from "astro";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTextBudgets } from "./rules/text-budgets";
import { checkDepthCheckpoints } from "./rules/depth-checkpoints";
import { checkTierAccordion } from "./rules/tier-accordion";
import { checkHydrationBudget } from "./rules/hydration-budget";
import { checkSpiralCues } from "./rules/spiral-cues";
import { checkI18nParity } from "./rules/i18n-parity";
import { checkSources } from "./rules/sources";
import { checkReducedMotion } from "./rules/reduced-motion";
import { checkPersonas } from "./rules/personas";
import { checkTierWordBudgets } from "./rules/tier-word-budgets";
import { checkExerciseCounts } from "./rules/exercise-counts";

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

export function lintCurriculum(): AstroIntegration {
  return {
    name: "lint-curriculum",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const files = await walk(root);
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const f of files) {
          const html = await readFile(f, "utf8");
          errors.push(...checkTextBudgets(html, f));
          errors.push(...checkDepthCheckpoints(html, f));
          errors.push(...checkTierAccordion(html, f));
          errors.push(...checkHydrationBudget(html, f));
          warnings.push(...checkSpiralCues(html, f));
          errors.push(...checkSources(html, f));
          errors.push(...checkPersonas(html, f));
          warnings.push(...checkTierWordBudgets(html, f));
          warnings.push(...checkExerciseCounts(html, f));
        }

        // Source-level + global checks
        const siteSrc = fileURLToPath(new URL("../src/", dir));
        errors.push(...(await checkI18nParity(siteSrc)));
        errors.push(...(await checkReducedMotion(root)));

        await writeFile(
          join(root, "lint-report.json"),
          JSON.stringify({ errors, warnings }, null, 2)
        );

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
