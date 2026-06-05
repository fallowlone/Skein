#!/usr/bin/env bun
// Standalone curriculum lint, run as a SEPARATE process AFTER `astro build`
// (see package.json `build`). Running the lint inside astro's `astro:build:done`
// hook made it inherit the render's ~10GB retained heap; the extra lint
// allocations then pushed the CI runner past its 16GB physical RAM and the
// kernel SIGKILL'd the build mid-lint. As its own process the render has already
// exited and freed everything, so the lint starts clean and peak memory is low.
//
// Reuses the exact same rule logic via runLint() — no duplicated checks.
import { fileURLToPath } from "node:url";
import { runLint } from "../src/lint/index.ts";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const siteSrc = fileURLToPath(new URL("../src/", import.meta.url));

const { errors, warnings } = await runLint(root, siteSrc);

if (warnings.length) console.warn(`lint: ${warnings.length} warnings (see dist/lint-report.json)`);
if (errors.length) {
  console.error(`lint failed with ${errors.length} errors:\n${errors.slice(0, 20).join("\n")}`);
  process.exit(1);
}
console.log(`lint: clean — 0 errors, ${warnings.length} warnings`);
