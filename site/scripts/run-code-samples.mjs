#!/usr/bin/env bun
/**
 * run-code-samples.mjs — execute the runnable code samples embedded in lessons.
 *
 * Why: lesson code is the product. A fenced block that crashes on the runtime it
 * teaches (e.g. a scrypt call that exceeds the default maxmem) is a correctness
 * bug shipped to learners. `bun run build` + lint never executes a single sample,
 * so these slip through. This harness runs the ones an author has opted in.
 *
 * Opt-in convention (info string after the language on a fenced block):
 *   ```js run            → execute this block; it must exit 0 within the timeout
 *   ```ts run            → same, TypeScript (bun runs it directly)
 *   ```js run expect-throws  → must throw / exit non-zero (teaching a failure)
 *   ```js run timeout=15000  → override the per-block timeout (ms)
 *   ```js no-run         → explicitly never run (documentation only; default anyway)
 * Anything without `run` is left untouched — most blocks are illustrative fragments.
 *
 * A `run` block must be SELF-CONTAINED: its own imports, only Node stdlib (node:*)
 * or deps installed in site/. The executed text is EXACTLY what the reader sees —
 * no hidden setup — so a green run means the displayed snippet actually works.
 *
 * Usage:
 *   bun scripts/run-code-samples.mjs            # run all runnable blocks (EN)
 *   bun scripts/run-code-samples.mjs --list     # list them, don't execute
 *   bun scripts/run-code-samples.mjs --filter node/14   # only matching paths
 *   bun scripts/run-code-samples.mjs --self-test        # prove the runner works
 * Exits non-zero if any runnable block fails its expectation.
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname; // site/
const LESSONS_DIR = join(ROOT, "src/content/lessons");
const DEFAULT_TIMEOUT = 10_000;
const RUN_LANGS = new Set(["js", "javascript", "mjs", "ts", "typescript"]);

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const opt = (f) => {
  const a = args.find((x) => x.startsWith(f + "="));
  return a ? a.slice(f.length + 1) : null;
};
const LANG = opt("--lang") || "en";
const FILTER = opt("--filter");

// ---- markdown fenced-block extraction -------------------------------------
const FENCE_RE = /```([\w-]+)([^\n]*)\n([\s\S]*?)```/g;

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.name.endsWith(".mdx") || e.name.endsWith(".md")) yield p;
  }
}

function parseMeta(meta) {
  const tokens = meta.trim().split(/\s+/).filter(Boolean);
  const flags = new Set();
  const kv = {};
  for (const t of tokens) {
    const m = t.match(/^([\w-]+)=(.+)$/);
    if (m) kv[m[1]] = m[2];
    else flags.add(t);
  }
  return { flags, kv };
}

function collectRunnable() {
  const langDir = join(LESSONS_DIR, LANG);
  const blocks = [];
  for (const file of walk(langDir)) {
    if (FILTER && !file.includes(FILTER)) continue;
    const src = readFileSync(file, "utf8");
    let m;
    let idx = 0;
    FENCE_RE.lastIndex = 0;
    while ((m = FENCE_RE.exec(src))) {
      idx++;
      const [, lang, meta, code] = m;
      const { flags, kv } = parseMeta(meta);
      if (!flags.has("run")) continue;
      if (!RUN_LANGS.has(lang.toLowerCase())) {
        blocks.push({ file, idx, lang, code, skip: `lang '${lang}' not runnable` });
        continue;
      }
      const line = src.slice(0, m.index).split("\n").length;
      blocks.push({
        file,
        idx,
        line,
        lang: lang.toLowerCase(),
        code,
        expectThrows: flags.has("expect-throws"),
        timeout: kv.timeout ? parseInt(kv.timeout, 10) : DEFAULT_TIMEOUT,
      });
    }
  }
  return blocks;
}

// ---- execution -------------------------------------------------------------
function runBlock(block, dir) {
  const ext = block.lang === "ts" || block.lang === "typescript" ? "ts" : "mjs";
  const tmp = join(dir, `block-${block.idx}.${ext}`);
  writeFileSync(tmp, block.code);
  const res = spawnSync("bun", [tmp], {
    timeout: block.timeout,
    encoding: "utf8",
    cwd: ROOT, // resolve any deps against site/node_modules
    env: { ...process.env, NODE_NO_WARNINGS: "1" },
  });
  const timedOut = res.error && res.error.code === "ETIMEDOUT";
  const threw = timedOut || res.status !== 0;
  const ok = block.expectThrows ? threw && !timedOut : !threw;
  return {
    ok,
    timedOut,
    status: res.status,
    stderr: (res.stderr || "").trim(),
    signal: res.signal,
  };
}

function rel(f) {
  return f.replace(ROOT, "").replace(/^\/?src\/content\/lessons\//, "");
}

// Pull the meaningful error line out of bun's stderr (skip the version banner).
function meaningfulError(stderr) {
  const lines = stderr.split("\n").map((l) => l.trim()).filter(Boolean);
  const hit = lines.find((l) => /error|throw|exception|cannot|not a function|undefined|invalid/i.test(l) && !/^Bun v/.test(l));
  return hit || lines.find((l) => !/^Bun v/.test(l)) || stderr.trim();
}

// ---- self test: prove the runner catches a crash ---------------------------
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), "samples-selftest-"));
  try {
    const good = runBlock(
      { idx: 1, lang: "mjs", code: "import crypto from 'node:crypto';\nconst k = crypto.scrypt;\nif (typeof k !== 'function') throw new Error('x');\n", timeout: 5000, expectThrows: false },
      dir,
    );
    const bad = runBlock(
      { idx: 2, lang: "mjs", code: "import crypto from 'node:crypto';\ncrypto.scryptSync('p','saltsalt',64,{N:2**15});\n", timeout: 5000, expectThrows: false },
      dir,
    );
    const pass = good.ok && !bad.ok;
    console.log(`self-test: good-sample ok=${good.ok}, broken-sample ok=${bad.ok} → ${pass ? "PASS" : "FAIL"}`);
    if (!bad.ok) console.log(`  (broken sample correctly failed: ${meaningfulError(bad.stderr)})`);
    return pass ? 0 : 1;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---- main ------------------------------------------------------------------
function main() {
  if (has("--self-test")) process.exit(selfTest());

  const blocks = collectRunnable();
  const runnable = blocks.filter((b) => !b.skip);
  const skipped = blocks.filter((b) => b.skip);

  if (has("--list")) {
    console.log(`Runnable code samples (lang=${LANG}):`);
    for (const b of runnable) console.log(`  ${rel(b.file)}  block#${b.idx} (line ${b.line}, ${b.lang})${b.expectThrows ? " [expect-throws]" : ""}`);
    for (const b of skipped) console.log(`  SKIP ${rel(b.file)} block#${b.idx}: ${b.skip}`);
    console.log(`\n${runnable.length} runnable, ${skipped.length} skipped.`);
    process.exit(0);
  }

  if (runnable.length === 0) {
    console.log("No runnable code samples found. Tag blocks with ```<lang> run to enable execution.");
    process.exit(0);
  }

  const dir = mkdtempSync(join(tmpdir(), "samples-"));
  const failures = [];
  let passed = 0;
  try {
    for (const b of runnable) {
      const r = runBlock(b, dir);
      if (r.ok) {
        passed++;
        process.stdout.write(".");
      } else {
        process.stdout.write("F");
        failures.push({ b, r });
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  process.stdout.write("\n\n");

  for (const { b, r } of failures) {
    console.log(`FAIL ${rel(b.file)} block#${b.idx} (line ${b.line})`);
    if (r.timedOut) console.log(`  timed out after ${b.timeout}ms`);
    else if (b.expectThrows) console.log(`  expected a throw/non-zero exit but it exited 0`);
    else console.log(`  exited ${r.status}${r.signal ? ` (signal ${r.signal})` : ""}`);
    if (r.stderr) console.log("  | " + meaningfulError(r.stderr));
    console.log("");
  }

  console.log(`${passed}/${runnable.length} runnable samples passed${skipped.length ? `, ${skipped.length} skipped` : ""}.`);
  process.exit(failures.length ? 1 : 0);
}

main();
