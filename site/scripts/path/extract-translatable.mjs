// Per-track list of translatable concepts (P3-D filter A): clean + taught + ru===en + not already
// in concept-labels.json + has a real word. Writes /tmp/path-translatable.json + prints per-track counts.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(OUT, "concepts.json"), "utf8"));
const units = JSON.parse(readFileSync(join(OUT, "unit-concepts.json"), "utf8"));
const labelFile = join(OUT, "concept-labels.json");
const already = existsSync(labelFile) ? JSON.parse(readFileSync(labelFile, "utf8")) : {};

const taught = new Set();
for (const k of Object.keys(units)) for (const t of units[k].teaches) taught.add(t);

const clean = (c) =>
  taught.has(c.id) && /^[a-z0-9]/i.test(c.id) && c.label.en === c.label.en.trim() && c.label.en.length > 1;
const translatable = (c) =>
  clean(c) && c.label.ru === c.label.en && !(c.id in already) && /[a-z]{3}/i.test(c.label.en);

const byTrack = {};
for (const c of concepts) {
  if (!translatable(c)) continue;
  (byTrack[c.track] ??= []).push({ id: c.id, en: c.label.en, band: c.band });
}
writeFileSync("/tmp/path-translatable.json", JSON.stringify(byTrack, null, 2) + "\n");
const counts = Object.fromEntries(Object.entries(byTrack).map(([t, a]) => [t, a.length]));
const total = Object.values(counts).reduce((n, x) => n + x, 0);
console.log(JSON.stringify({ total, tracks: Object.keys(byTrack).length, perTrack: counts }, null, 2));
