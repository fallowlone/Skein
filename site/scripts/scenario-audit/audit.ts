#!/usr/bin/env bun
// Inventory incident/debug/review coverage across teaching spine lessons,
// print a per-track report, write docs/audit/scenario-worklist.json, and
// (with --gate) exit 1 if any candidate lesson still lacks its target type.
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { enumerateUnits } from "../depth-audit/lessons";
import { classifyLesson, isFoundation } from "../depth-audit/classify";
import { typesByLesson, type PracticeFile } from "./inventory";
import { candidatesFor, type LessonMeta, type ScenarioType } from "./worklist";

const siteRoot = fileURLToPath(new URL("../../", import.meta.url));
const siteSrc = join(siteRoot, "src");
const PRACTICE = join(siteSrc, "content/practice");
const DOCS = join(siteRoot, "..", "docs", "audit");

const fm = (body: string, key: string) => {
  const m = body.match(new RegExp(`^${key}:[ \\t]*["']?([^"'\\n]+?)["']?[ \\t]*$`, "m"));
  return m ? m[1].trim() : null;
};

async function walkJson(dir: string, acc: string[] = []): Promise<string[]> {
  let items;
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) await walkJson(p, acc);
    else if (it.name.endsWith(".json")) acc.push(p);
  }
  return acc;
}

const files: PracticeFile[] = [];
const markerTypes = new Map<string, Set<string>>();
for (const p of await walkJson(PRACTICE)) {
  let data: any;
  try { data = JSON.parse(await readFile(p, "utf8")); } catch { continue; }
  if (!data?.lessonKey) continue;
  files.push({ lessonKey: data.lessonKey, track: data.track, tasks: data.tasks ?? [] });
  const markers = new Set<string>();
  for (const t of data.tasks ?? []) {
    markers.add(t.type);
    if ((t.type === "sandbox" || t.type === "fix") && (t.runtime === "js" || t.runtime === "sql")) {
      markers.add(`${t.type}-${t.runtime}`);
    }
  }
  markerTypes.set(data.lessonKey, markers);
}
const coverage = typesByLesson(files);

const units = await enumerateUnits(siteSrc);
const lessons: LessonMeta[] = [];
for (const u of units) {
  for (const l of u.lessons) {
    if (classifyLesson(l.lessonKey) !== "teaching") continue;
    if (isFoundation(l.lessonKey)) continue;
    const body = await readFile(l.path, "utf8").catch(() => "");
    const lessonType = fm(body, "lessonType") as LessonMeta["lessonType"] | null;
    const cov = coverage.get(l.lessonKey);
    lessons.push({
      lessonKey: l.lessonKey,
      track: l.track,
      level: l.level,
      lessonType,
      types: markerTypes.get(l.lessonKey) ?? new Set(),
      taskCount: cov?.taskCount ?? 0,
      atCap: cov?.atCap ?? false,
    });
  }
}

const TYPES: ScenarioType[] = ["incident", "debug", "review"];
const worklist: Record<ScenarioType, string[]> = { incident: [], debug: [], review: [] };
for (const t of TYPES) worklist[t] = candidatesFor(t, lessons).map((l) => l.lessonKey);

const byTrack = new Map<string, { n: number; inc: number; dbg: number; rev: number }>();
for (const l of lessons) {
  const b = byTrack.get(l.track) ?? { n: 0, inc: 0, dbg: 0, rev: 0 };
  b.n++;
  if (l.types.has("incident")) b.inc++;
  if (l.types.has("debug")) b.dbg++;
  if (l.types.has("review")) b.rev++;
  byTrack.set(l.track, b);
}
let report = `# Scenario coverage (teaching spine lessons)\n\nLessons: ${lessons.length}\n\n`;
report += `Candidates remaining — incident: ${worklist.incident.length}, debug: ${worklist.debug.length}, review: ${worklist.review.length}\n\n`;
report += `| track | #les | inc% | dbg% | rev% |\n|---|---|---|---|---|\n`;
for (const track of [...byTrack.keys()].sort()) {
  const b = byTrack.get(track)!;
  const pct = (x: number) => `${Math.round((100 * x) / b.n)}%`;
  report += `| ${track} | ${b.n} | ${pct(b.inc)} | ${pct(b.dbg)} | ${pct(b.rev)} |\n`;
}

await mkdir(DOCS, { recursive: true });
await writeFile(join(DOCS, "scenario-coverage.md"), report);
await writeFile(join(DOCS, "scenario-worklist.json"), JSON.stringify(worklist, null, 2));
console.log(report);

if (process.argv.includes("--gate")) {
  const want = process.argv.slice(process.argv.indexOf("--gate") + 1).filter((a) => !a.startsWith("--"));
  const checkTypes = (want.length ? want : TYPES) as ScenarioType[];
  const remaining = checkTypes.flatMap((t) => worklist[t].map((k) => `${t}:${k}`));
  if (remaining.length) {
    console.error(`scenario gate: ${remaining.length} candidate(s) still missing a target type.`);
    process.exit(1);
  }
  console.log("scenario gate: OK — all targeted lessons covered.");
}
