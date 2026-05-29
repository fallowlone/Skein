import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const PATTERNS = new Set([
  "arrays-hashing", "two-pointers", "sliding-window", "stack", "binary-search",
  "linked-list", "trees", "tries", "heap-priority-queue", "backtracking",
  "graphs", "advanced-graphs", "1d-dp", "2d-dp", "greedy", "intervals",
  "math-geometry", "bit-manipulation",
]);
const DIFF_RANK: Record<string, number> = { easy: 0, medium: 1, hard: 2 };
const UNTRANSLATED_MIN_LEN = 12;

export function lintDrillData(file: string, data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unitPatterns = new Set<string>(data.patterns ?? []);

  for (const p of data.problems ?? []) {
    if ("statement" in p || "description" in p)
      errors.push(`drill: "${file}" problem "${p.id}" must not embed a LeetCode statement/description`);
    if (!PATTERNS.has(p.pattern))
      errors.push(`drill: "${file}" problem "${p.id}" has unknown pattern "${p.pattern}"`);
    if (!unitPatterns.has(p.pattern))
      errors.push(`drill: "${file}" problem "${p.id}" pattern "${p.pattern}" not in unit patterns [${[...unitPatterns].join(", ")}]`);

    const bis = [...(p.hints ?? []), ...(p.followUp ? [p.followUp] : [])];
    for (const b of bis) {
      if (!b.en?.trim() || !b.ru?.trim())
        errors.push(`drill: "${file}" problem "${p.id}" has a whitespace-only en/ru field`);
      else if (b.en.length >= UNTRANSLATED_MIN_LEN && b.en.trim() === b.ru.trim())
        errors.push(`drill: "${file}" problem "${p.id}" has an untranslated field (en === ru)`);
    }
  }

  const seenRank: Record<string, number> = {};
  for (const p of data.problems ?? []) {
    const r = DIFF_RANK[p.difficulty] ?? 0;
    if (p.pattern in seenRank && r < seenRank[p.pattern])
      warnings.push(`drill: "${file}" difficulty ramp dips at "${p.id}" within "${p.pattern}"`);
    seenRank[p.pattern] = Math.max(seenRank[p.pattern] ?? 0, r);
  }

  if (data.intro && (!data.intro.en?.trim() || !data.intro.ru?.trim()))
    errors.push(`drill: "${file}" intro has a whitespace-only en/ru field`);
  return { errors, warnings };
}

async function readDrill(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/drill");
  const files: string[] = [];
  async function walk(d: string) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      const p = join(d, i.name);
      if (i.isDirectory()) await walk(p);
      else if (i.name.endsWith(".json")) files.push(p);
    }
  }
  await walk(dir);
  const out: { file: string; data: any }[] = [];
  for (const f of files) {
    try { out.push({ file: f, data: JSON.parse(await readFile(f, "utf8")) }); } catch { /* schema handles malformed */ }
  }
  return out;
}

export async function checkDrill(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const all = await readDrill(siteSrc);
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<number, string>();
  for (const { file, data } of all) {
    const r = lintDrillData(file, data);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    for (const p of data.problems ?? []) {
      if (seenIds.has(p.leetcodeId))
        errors.push(`drill: leetcodeId ${p.leetcodeId} duplicated in "${file}" and "${seenIds.get(p.leetcodeId)}"`);
      else seenIds.set(p.leetcodeId, file);
    }
  }
  return { errors, warnings };
}
