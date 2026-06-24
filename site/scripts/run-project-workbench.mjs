#!/usr/bin/env bun
// verify:projects — for every workbench under site/projects-workbench/<slug>/, copy
// solution/ over scaffold/ in a temp dir and assert the scaffold FAILS `bun test` while
// the scaffold+solution PASSES. Green ⇒ the acceptance suite bites AND the project is
// solvable. Mirrors scripts/run-code-samples.mjs (the verify:samples runner).
import {
  readdirSync, statSync, mkdtempSync, cpSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = new URL("../projects-workbench/", import.meta.url).pathname;
const TIMEOUT_MS = 30_000;

function bunTest(dir) {
  const r = spawnSync("bun", ["test"], { cwd: dir, timeout: TIMEOUT_MS, encoding: "utf8" });
  return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

// Verify a {scaffold, solution} pair on disk. Returns { ok, reason }.
function verifyDir(base) {
  const tmp = mkdtempSync(join(tmpdir(), "wb-"));
  try {
    cpSync(join(base, "scaffold"), tmp, { recursive: true });
    if (bunTest(tmp).code === 0) return { ok: false, reason: "scaffold PASSED — tests do not bite" };
    cpSync(join(base, "solution"), tmp, { recursive: true });
    const b = bunTest(tmp);
    if (b.code !== 0) return { ok: false, reason: `solution FAILED:\n${b.out.slice(-1000)}` };
    return { ok: true, reason: "scaffold fails, solution passes" };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function verifyOne(slug) {
  const base = join(ROOT, slug);
  const manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8"));
  if (manifest.stack !== "bun-ts") return { ok: true, reason: `skipped (stack=${manifest.stack})` };
  return verifyDir(base);
}

function listWorkbenches() {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT).filter((d) => {
    const p = join(ROOT, d);
    return statSync(p).isDirectory() && existsSync(join(p, "manifest.json"));
  });
}

// Prove the runner itself: a scaffold that already passes, a never-fixed pair, and a
// properly-fixed pair must be classified ok:false / ok:false / ok:true respectively.
function selfTest() {
  const root = mkdtempSync(join(tmpdir(), "wb-self-"));
  const mk = (name, scaffoldBody, solutionBody) => {
    const base = join(root, name);
    mkdirSync(join(base, "scaffold"), { recursive: true });
    mkdirSync(join(base, "solution"), { recursive: true });
    writeFileSync(join(base, "scaffold", "x.test.ts"),
      `import {test,expect} from "bun:test";\nimport {f} from "./f";\ntest("t",()=>expect(f()).toBe(1));`);
    writeFileSync(join(base, "scaffold", "f.ts"), scaffoldBody);
    writeFileSync(join(base, "solution", "f.ts"), solutionBody);
    return base;
  };
  const a = verifyDir(mk("a", "export const f=()=>1;", "export const f=()=>1;")); // scaffold already passes
  const b = verifyDir(mk("b", "export const f=()=>0;", "export const f=()=>0;")); // never fixed
  const c = verifyDir(mk("c", "export const f=()=>0;", "export const f=()=>1;")); // properly fixed
  rmSync(root, { recursive: true, force: true });
  const pass = a.ok === false && b.ok === false && c.ok === true;
  console.log(pass ? "self-test OK" : `self-test FAILED a=${a.ok} b=${b.ok} c=${c.ok}`);
  return pass;
}

if (process.argv.includes("--self-test")) {
  process.exit(selfTest() ? 0 : 1);
}

let failed = 0;
for (const slug of listWorkbenches()) {
  const { ok, reason } = verifyOne(slug);
  console.log(`${ok ? "✓" : "✗"} ${slug} — ${reason}`);
  if (!ok) failed++;
}
console.log(failed ? `verify:projects FAILED (${failed})` : "verify:projects OK");
process.exit(failed ? 1 : 0);
