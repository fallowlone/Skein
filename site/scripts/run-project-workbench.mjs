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

// Per-stack test commands. Python uses stdlib unittest rather than pytest so a
// learner needs nothing installed beyond the interpreter; Go uses the toolchain's
// own runner. Add a stack here and the whole pipeline picks it up.
const STACKS = {
  "bun-ts": { cmd: "bun", args: ["test"], probe: ["bun", ["--version"]] },
  python: {
    cmd: "python3",
    args: ["-m", "unittest", "discover", "-s", ".", "-p", "test_*.py"],
    probe: ["python3", ["--version"]],
    // Without this the first (scaffold) run writes __pycache__, and because cpSync
    // preserves the solution's mtime the second run re-imports the STALE bytecode —
    // a correct solution then "fails" with the scaffold's behaviour.
    env: { PYTHONDONTWRITEBYTECODE: "1" },
  },
  go: { cmd: "go", args: ["test", "./..."], probe: ["go", ["version"]] },
};

function run(cmd, args, dir, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd: dir,
    timeout: TIMEOUT_MS,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
  return { code: r.status ?? 1, out: (r.stdout ?? "") + (r.stderr ?? "") };
}

function toolchainPresent(stack) {
  const [cmd, args] = STACKS[stack].probe;
  return run(cmd, args, tmpdir()).code === 0;
}

// Verify a {scaffold, solution} pair on disk. Returns { ok, reason }.
function verifyDir(base, stack = "bun-ts") {
  const { cmd, args, env = {} } = STACKS[stack];
  const tmp = mkdtempSync(join(tmpdir(), "wb-"));
  try {
    cpSync(join(base, "scaffold"), tmp, { recursive: true });
    if (run(cmd, args, tmp, env).code === 0) return { ok: false, reason: "scaffold PASSED — tests do not bite" };
    cpSync(join(base, "solution"), tmp, { recursive: true });
    const b = run(cmd, args, tmp, env);
    if (b.code !== 0) return { ok: false, reason: `solution FAILED:\n${b.out.slice(-1000)}` };
    return { ok: true, reason: `scaffold fails, solution passes (${stack})` };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function verifyOne(slug) {
  const base = join(ROOT, slug);
  const manifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8"));
  const stack = manifest.stack ?? "bun-ts";
  // An unknown stack used to return ok:true ("skipped"), which reported a green
  // tick for a workbench nothing had verified. Unverifiable is a failure.
  if (!STACKS[stack]) return { ok: false, reason: `unsupported stack "${stack}" — add it to STACKS or fix the manifest` };
  // A missing toolchain is an environment gap, not a broken workbench: skip loudly
  // so a machine without Go does not fail the whole run.
  if (!toolchainPresent(stack)) return { ok: true, reason: `SKIPPED — ${stack} toolchain not installed`, skipped: true };
  return verifyDir(base, stack);
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

  // Same three cases through the python stack, so a second runtime is proven and
  // not just wired.
  let py = { ok: true };
  if (toolchainPresent("python")) {
    const base = join(root, "py");
    mkdirSync(join(base, "scaffold"), { recursive: true });
    mkdirSync(join(base, "solution"), { recursive: true });
    writeFileSync(
      join(base, "scaffold", "test_f.py"),
      "import unittest\nfrom f import f\n\nclass T(unittest.TestCase):\n    def test_f(self):\n        self.assertEqual(f(), 1)\n",
    );
    writeFileSync(join(base, "scaffold", "f.py"), "def f():\n    return 0\n");
    writeFileSync(join(base, "solution", "f.py"), "def f():\n    return 1\n");
    py = verifyDir(base, "python");
  }

  rmSync(root, { recursive: true, force: true });
  const pass = a.ok === false && b.ok === false && c.ok === true && py.ok === true;
  console.log(pass ? "self-test OK" : `self-test FAILED a=${a.ok} b=${b.ok} c=${c.ok} py=${py.ok}`);
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
