import { readFile, readdir } from "node:fs/promises";
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

  return { errors, warnings };
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
  for (const { file, data } of await readCapstones(siteSrc)) {
    const r = lintCapstoneData(file, data);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  return { errors, warnings };
}
