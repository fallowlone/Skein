// One-time, re-runnable importer. Reads steep grammar JSONs → maps → serializes
// one TS module per topic. Idempotent: regenerates skeletons. Authored fields
// (EN prose, taxonomy) live in the files after Task 8; re-running this OVERWRITES
// them, so only run it on a clean corpus (before authoring) or with --dry first.
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { mapSteepTopic, type SteepTopic } from "./map";
import { serializeTopic } from "./serialize";

const SRC = process.env.STEEP_GRAMMAR_DIR
  ?? "/Users/artemmac/dev/personal/steep/grammar/explanations/data";
const OUT = resolve(import.meta.dir, "../../src/english/data/grammar");
const dry = process.argv.includes("--dry");

function main(): void {
  if (!existsSync(SRC)) { console.error(`steep source not found: ${SRC}`); process.exit(1); }
  if (!dry) mkdirSync(OUT, { recursive: true });
  const files = readdirSync(SRC).filter((f) => f.endsWith(".json"));
  let n = 0;
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(SRC, f), "utf8")) as SteepTopic;
    const topic = mapSteepTopic(raw);
    const dest = join(OUT, `${topic.id}.ts`);
    if (dry) { console.log(`would write ${topic.id}.ts (${topic.levels.join(",")})`); n++; continue; }
    writeFileSync(dest, serializeTopic(topic), "utf8");
    n++;
  }
  console.log(`${dry ? "planned" : "wrote"} ${n} topic modules → ${OUT}`);
}

main();
