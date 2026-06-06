// Deterministic keystone shortlist per track, for cross-track edge discovery.
// Keystone = clean label, taught by >=1 unit, ranked by requiredBy in-degree then band then id.
// Anchors (prereq/Y side): band in {foundations,surface,middle}, cap 30/track.
// Consumers (X side): band in {middle,advanced}, cap 40/track.
// Writes /tmp/path-keystones.json and prints a summary.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../../src/content/path");
const concepts = JSON.parse(readFileSync(join(SRC, "concepts.json"), "utf8"));
const units = JSON.parse(readFileSync(join(SRC, "unit-concepts.json"), "utf8"));

const taught = new Set();
for (const k of Object.keys(units)) for (const t of units[k].teaches) taught.add(t);

// requiredBy in-degree (how load-bearing a concept is in the existing graph).
const inDeg = new Map();
for (const c of concepts) for (const r of c.requires) inDeg.set(r, (inDeg.get(r) ?? 0) + 1);

// Clean = taught, id starts alphanumeric, label.en has no leading/trailing space and length > 1.
const clean = (c) =>
  taught.has(c.id) && /^[a-z0-9]/i.test(c.id) && c.label?.en && c.label.en === c.label.en.trim() && c.label.en.length > 1;

const BAND_RANK = { foundations: 0, surface: 1, middle: 2, advanced: 3 };
const rank = (a, b) => (inDeg.get(b.id) ?? 0) - (inDeg.get(a.id) ?? 0) || BAND_RANK[a.band] - BAND_RANK[b.band] || a.id.localeCompare(b.id);
const slim = (c) => ({ id: c.id, label: c.label.en, track: c.track, band: c.band, inDeg: inDeg.get(c.id) ?? 0 });

const tracks = [...new Set(concepts.map((c) => c.track))].sort();
const out = { tracks: {}, anchorMenu: [] };

for (const tr of tracks) {
  const inTrack = concepts.filter((c) => c.track === tr && clean(c));
  const anchors = inTrack.filter((c) => BAND_RANK[c.band] <= 2).sort(rank).slice(0, 30).map(slim);
  const consumers = inTrack.filter((c) => BAND_RANK[c.band] >= 2).sort(rank).slice(0, 40).map(slim);
  out.tracks[tr] = { anchors, consumers };
}
// Global anchor menu: top anchors across all tracks (cap 8 per track to bound the prompt).
for (const tr of tracks) out.anchorMenu.push(...out.tracks[tr].anchors.slice(0, 8));

writeFileSync("/tmp/path-keystones.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({
  tracks: tracks.length,
  anchorMenu: out.anchorMenu.length,
  perTrack: Object.fromEntries(tracks.map((t) => [t, { anchors: out.tracks[t].anchors.length, consumers: out.tracks[t].consumers.length }])),
}, null, 2));
