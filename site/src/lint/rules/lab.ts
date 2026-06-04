import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const UNTRANSLATED_MIN_LEN = 25; // mirror practice-parity: flag en===ru only on prose-length fields
const REQUIRED_TIERS = ["warmup", "build", "diagnose", "capstone"] as const;
const TIER_MIN: Record<string, number> = { warmup: 5, build: 8, diagnose: 5, capstone: 2 };

/** Fields whose en/ru content is legitimately language-neutral (machine output) —
 *  exempt from the en===ru equality check, never from whitespace. Mirrors practice.ts. */
const LANG_NEUTRAL_FIELDS = new Set(["evidence"]);

/** Recursively find every {en, ru} string pair, tagged with the parent property key. */
function biTexts(node: any, key: string | undefined, out: { en: string; ru: string; key?: string }[] = []): { en: string; ru: string; key?: string }[] {
  if (Array.isArray(node)) {
    for (const el of node) biTexts(el, key, out);
  } else if (node && typeof node === "object") {
    if (typeof node.en === "string" && typeof node.ru === "string") out.push({ en: node.en, ru: node.ru, key });
    for (const k of Object.keys(node)) biTexts(node[k], k, out);
  }
  return out;
}

export function lintLabData(file: string, data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const bt of biTexts(data, undefined)) {
    if (!bt.en.trim() || !bt.ru.trim())
      errors.push(`lab: "${file}" has a whitespace-only en/ru field`);
    else if (!LANG_NEUTRAL_FIELDS.has(bt.key ?? "") && bt.en.length >= UNTRANSLATED_MIN_LEN && bt.en.trim() === bt.ru.trim())
      errors.push(`lab: "${file}" has an untranslated field (en === ru): "${bt.en.slice(0, 40)}…"`);
  }
  return { errors, warnings };
}

export function aggregateLab(all: { file: string; data: any }[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seenIds = new Map<string, string>();          // `${track}:${id}` -> file
  const tiersByTrack = new Map<string, Set<string>>(); // track -> tiers present
  const countByTrackTier = new Map<string, number>();  // `${track}:${tier}` -> challenge count

  for (const { file, data } of all) {
    const r = lintLabData(file, data);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    const track = data.track, tier = data.tier;
    if (!tiersByTrack.has(track)) tiersByTrack.set(track, new Set());
    tiersByTrack.get(track)!.add(tier);
    countByTrackTier.set(`${track}:${tier}`, (countByTrackTier.get(`${track}:${tier}`) ?? 0) + (data.challenges?.length ?? 0));
    for (const c of data.challenges ?? []) {
      const key = `${track}:${c.id}`;
      if (seenIds.has(key)) errors.push(`lab: challenge id "${c.id}" duplicated in "${file}" and "${seenIds.get(key)}"`);
      else seenIds.set(key, file);
    }
  }
  for (const [track, tiers] of tiersByTrack) {
    for (const t of REQUIRED_TIERS) {
      if (!tiers.has(t)) errors.push(`lab: track "${track}" missing tier "${t}"`);
      else {
        const n = countByTrackTier.get(`${track}:${t}`) ?? 0;
        if (n < TIER_MIN[t]) warnings.push(`lab: track "${track}" tier "${t}" has ${n} challenges (< ${TIER_MIN[t]} target)`);
      }
    }
  }
  return { errors, warnings };
}

async function readLab(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/lab");
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

export async function checkLab(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  return aggregateLab(await readLab(siteSrc));
}
