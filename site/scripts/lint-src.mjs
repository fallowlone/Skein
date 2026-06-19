#!/usr/bin/env bun
// Pre-build source lint. Runs the source-only curriculum rules BEFORE `astro
// build` so authoring errors (i18n parity, practice parity, block stubs, path,
// drill/lab/capstone, cjk leak, retrieval-drawer slug, ...) fail in SECONDS
// instead of after the ~65-min full render. Reuses runSourceLint() from
// src/lint/index.ts — byte-identical logic to the post-build lint, no drift.
import { fileURLToPath } from "node:url";
import { runSourceLint } from "../src/lint/index.ts";

const siteSrc = fileURLToPath(new URL("../src/", import.meta.url));

const { errors, warnings } = await runSourceLint(siteSrc);

if (warnings.length) console.warn(`lint-src: ${warnings.length} warnings`);
if (errors.length) {
  console.error(`lint-src failed with ${errors.length} errors:\n${errors.slice(0, 20).join("\n")}`);
  process.exit(1);
}
console.log(`lint-src: clean — 0 errors, ${warnings.length} warnings`);
