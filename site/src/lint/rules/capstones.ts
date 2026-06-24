import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { TRACKS } from "../../types";

const UNTRANSLATED_MIN_LEN = 25; // only flag en===ru on prose-length fields
const TRACK_SET = new Set<string>(TRACKS as unknown as string[]);
const FEEDS_RE = /^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/;

/** Recursively find every {en, ru} string pair (mirrors practice.ts / lab.ts). */
function biTexts(node: any, out: { en: string; ru: string }[] = []): { en: string; ru: string }[] {
  if (Array.isArray(node)) {
    for (const el of node) biTexts(el, out);
  } else if (node && typeof node === "object") {
    if (typeof node.en === "string" && typeof node.ru === "string") out.push({ en: node.en, ru: node.ru });
    for (const k of Object.keys(node)) biTexts(node[k], out);
  }
  return out;
}

/** Apply the milestone bilingual-integrity checks (whitespace-only + untranslated prose) to any
 *  subtree, labelled for the message. Reused for rubric and reference. */
function pushBiIntegrity(file: string, label: string, node: any, errors: string[]): void {
  for (const bt of biTexts(node)) {
    if (!bt.en.trim() || !bt.ru.trim()) {
      errors.push(`capstones: "${file}" ${label} has a whitespace-only en/ru field`);
    } else if (bt.en.length >= UNTRANSLATED_MIN_LEN && bt.en.trim() === bt.ru.trim()) {
      errors.push(`capstones: "${file}" ${label} has an untranslated field (en === ru): "${bt.en.slice(0, 40)}…"`);
    }
  }
}

/** A guided milestone is an object carrying an `id`; legacy plain {en,ru} milestones are skipped. */
function isGuided(m: any): boolean {
  return m && typeof m === "object" && typeof m.id === "string";
}

export function lintCapstoneData(file: string, data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const milestones: any[] = Array.isArray(data?.milestones) ? data.milestones : [];

  for (const m of milestones) {
    if (!isGuided(m)) continue;
    for (const bt of biTexts(m)) {
      if (!bt.en.trim() || !bt.ru.trim()) {
        errors.push(`capstones: "${file}" milestone "${m.id}" has a whitespace-only en/ru field`);
      } else if (bt.en.length >= UNTRANSLATED_MIN_LEN && bt.en.trim() === bt.ru.trim()) {
        errors.push(`capstones: "${file}" milestone "${m.id}" has an untranslated field (en === ru): "${bt.en.slice(0, 40)}…"`);
      }
    }
    for (const key of m.feedsFrom ?? []) {
      if (typeof key !== "string" || !FEEDS_RE.test(key) || !TRACK_SET.has(key.split("/")[0])) {
        warnings.push(`capstones: "${file}" milestone "${m.id}" has a malformed feedsFrom key "${key}"`);
      }
    }
  }

  const ids = milestones.filter(isGuided).map((m) => m.id);
  const dups = new Set(ids.filter((id, i) => ids.indexOf(id) !== i));
  for (const id of dups) errors.push(`capstones: "${file}" has a duplicated milestone id "${id}"`);

  // Workbench additions: rubric + reference carry the same bilingual-integrity contract.
  if (Array.isArray(data?.rubric)) pushBiIntegrity(file, "rubric", data.rubric, errors);
  if (Array.isArray(data?.reference)) pushBiIntegrity(file, "reference", data.reference, errors);

  return { errors, warnings };
}

async function exists(p: string): Promise<boolean> {
  try { await stat(p); return true; } catch { return false; }
}

/** Workbench coherence: every `workbench:true` project has a complete projects-workbench/<slug>/
 *  (manifest stack=bun-ts + non-empty test, scaffold/, solution/, ≥1 *.test.ts under scaffold/test),
 *  and every workbench directory is claimed by exactly one such project (no orphans). `wbRoot` is the
 *  projects-workbench directory; injected so this is testable in isolation. */
export async function checkWorkbenchCoherence(
  projects: { file: string; data: any }[], wbRoot: string,
): Promise<string[]> {
  const errors: string[] = [];
  const declared = new Set<string>();
  for (const { file, data } of projects) {
    if (data?.workbench !== true) continue;
    const slug = typeof data.slug === "string" ? data.slug : "";
    if (!slug) { errors.push(`capstones: "${file}" workbench:true but has no slug`); continue; }
    declared.add(slug);
    const base = join(wbRoot, slug);
    if (!(await exists(base))) {
      errors.push(`capstones: "${file}" workbench:true but projects-workbench/${slug}/ is missing`);
      continue;
    }
    try {
      const mf = JSON.parse(await readFile(join(base, "manifest.json"), "utf8"));
      if (mf.stack !== "bun-ts") errors.push(`capstones: projects-workbench/${slug}/manifest.json has invalid stack "${mf.stack}"`);
      if (!mf.test) errors.push(`capstones: projects-workbench/${slug}/manifest.json is missing "test"`);
    } catch {
      errors.push(`capstones: projects-workbench/${slug}/manifest.json is missing or invalid`);
    }
    if (!(await exists(join(base, "scaffold")))) errors.push(`capstones: projects-workbench/${slug}/scaffold/ is missing`);
    if (!(await exists(join(base, "solution")))) errors.push(`capstones: projects-workbench/${slug}/solution/ is missing`);
    let hasTest = false;
    try { hasTest = (await readdir(join(base, "scaffold", "test"))).some((f) => f.endsWith(".test.ts")); } catch { /* none */ }
    if (!hasTest) errors.push(`capstones: projects-workbench/${slug}/scaffold/test/ has no *.test.ts`);
  }
  // Orphan scan: a workbench directory with no claiming project.
  try {
    for (const d of await readdir(wbRoot, { withFileTypes: true })) {
      if (d.isDirectory() && !declared.has(d.name)) {
        errors.push(`capstones: projects-workbench/${d.name}/ has no project with workbench:true (orphan)`);
      }
    }
  } catch { /* no workbench dir yet — nothing to orphan-check */ }
  return errors;
}

async function readCapstones(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/projects");
  let items: import("node:fs").Dirent[];
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out: { file: string; data: any }[] = [];
  for (const i of items) {
    if (!i.isFile() || !i.name.endsWith(".json")) continue;
    const p = join(dir, i.name);
    try { out.push({ file: p, data: JSON.parse(await readFile(p, "utf8")) }); } catch { /* schema owns malformed */ }
  }
  return out;
}

export async function checkCapstones(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const projects = await readCapstones(siteSrc);
  for (const { file, data } of projects) {
    const r = lintCapstoneData(file, data);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  // projects-workbench lives at site/projects-workbench (siteSrc is site/src).
  errors.push(...await checkWorkbenchCoherence(projects, join(siteSrc, "..", "projects-workbench")));
  return { errors, warnings };
}
