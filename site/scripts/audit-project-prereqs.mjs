// Audit project ↔ lesson prerequisite wiring.
//  (1) validate every milestone feedsFrom key resolves to a real lesson
//  (2) surface "on-the-nose" units a project's topic implies but doesn't link
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const LROOT = "src/content/lessons/en";
const PROOT = "src/content/projects";

// lesson keys + unit index (track/unit -> {lessons[], titleWords})
const lessonKeys = new Set();
const units = new Map(); // "track/unit" -> { key, words:Set }
for (const track of readdirSync(LROOT)) {
  const tdir = join(LROOT, track); if (!statSync(tdir).isDirectory()) continue;
  for (const unit of readdirSync(tdir)) {
    const udir = join(tdir, unit); if (!statSync(udir).isDirectory()) continue;
    const uKey = `${track}/${unit}`;
    const words = new Set(unit.replace(/^\d+-/, "").split("-"));
    for (const lesson of readdirSync(udir)) {
      const ldir = join(udir, lesson);
      if (!statSync(ldir).isDirectory() || !existsSync(join(ldir, "index.mdx"))) continue;
      lessonKeys.add(`${track}/${unit}/${lesson}`);
      for (const w of lesson.replace(/^\d+-/, "").split("-")) words.add(w);
    }
    units.set(uKey, { key: uKey, words });
  }
}

const STOP = new Set(["the","a","and","to","of","in","at","is","for","with","your","via","mini","lab","service","app","page","at-scale","scale","from","on","an","two","into","real","time"]);
const toks = (s) => (s || "").toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)) ?? [];

const projFiles = readdirSync(PROOT).filter((f) => f.endsWith(".json"));
let totalBroken = 0;
for (const f of projFiles) {
  const j = JSON.parse(readFileSync(join(PROOT, f), "utf8"));
  const feeds = new Set();
  for (const m of j.milestones ?? []) if (typeof m === "object") for (const k of m.feedsFrom ?? []) feeds.add(k);
  const broken = [...feeds].filter((k) => !lessonKeys.has(k));
  const linkedUnits = new Set([...feeds].map((k) => k.split("/").slice(0, 2).join("/")));

  // topic tokens from slug + title + skills + stack
  const topic = new Set([
    ...toks(j.slug), ...toks(j.title?.en), ...(j.skills ?? []).flatMap(toks), ...(j.stack ?? []).flatMap(toks),
  ]);
  // candidate units: share >=2 distinctive tokens with the project, not yet linked
  const cand = [];
  for (const [uKey, u] of units) {
    if (linkedUnits.has(uKey)) continue;
    const hits = [...topic].filter((t) => u.words.has(t));
    if (hits.length >= 2) cand.push({ uKey, hits });
  }
  cand.sort((a, b) => b.hits.length - a.hits.length);

  totalBroken += broken.length;
  if (broken.length || cand.length) {
    console.log(`\n■ ${j.slug}  [${j.category}/${j.difficulty}]  feeds=${feeds.size} units=${linkedUnits.size}`);
    if (broken.length) console.log(`  ✗ BROKEN feedsFrom: ${broken.join(", ")}`);
    for (const c of cand.slice(0, 5)) console.log(`  + maybe link  ${c.uKey}   (${c.hits.join(",")})`);
  }
}
console.log(`\n${projFiles.length} projects · total broken feedsFrom keys: ${totalBroken}`);
