#!/usr/bin/env node
// Practice-coverage audit. For every TEACHING `status: ready` EN lesson, find
// its matching practice JSON and check that the lesson is not "thin":
//
//   THIN := fewer than MIN_TASKS tasks  OR  missing >=1 of the 3 difficulty
//           tiers (recall / apply / stretch).
//
// A lesson with no practice file at all is THIN (0 tasks, 0 tiers).
//
// Candidate set is TEACHING lessons only — navigation/exercise scaffolds
// (project, drill, quiz-*, 00-start-here overviews) are auxiliary and are NOT
// required to carry per-task practice, so they are excluded (mirrors
// classifyLesson in scripts/depth-audit/classify.ts and the scenario audit).
//
// Lessons live at  src/content/lessons/en/<track>/<unit>/<slug>/index.mdx
// Practice lives at src/content/practice/<track>/<unit>/<slug>.json, top-level
// `tasks: [...]`, each task `{ type, difficulty, id }` with difficulty in
// recall|apply|stretch. lessonKey = `<track>/<unit>/<slug>`.
//
// Output: a stdout summary + scripts/practice-coverage/worklist.json (the full
// THIN worklist). With --gate: exit 1 if any THIN lesson remains, else 0.
//
// Plain Node ESM, no deps. Run with `bun` or `node`.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const MIN_TASKS = 4;
const TIERS = ["recall", "apply", "stretch"];

// Teaching vs auxiliary classification — mirrors classifyLesson() in
// scripts/depth-audit/classify.ts. Auxiliary = navigation/exercise entries
// (project, drill, quiz-*, 00-start-here overviews) that legitimately carry no
// per-task practice and must not count toward thin coverage.
function isTeaching(lessonKey) {
  const slug = lessonKey.split("/").pop() ?? "";
  if (slug === "project" || slug === "drill" || slug.startsWith("quiz-")) return false;
  if (lessonKey.includes("/00-start-here/")) return false;
  return true;
}

const here = dirname(fileURLToPath(import.meta.url));
const siteSrc = join(here, "..", "..", "src");
const LESSONS_EN = join(siteSrc, "content/lessons/en");
const PRACTICE = join(siteSrc, "content/practice");
const OUT = join(here, "worklist.json");

async function subdirs(dir) {
  const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return items.filter((i) => i.isDirectory()).map((i) => i.name).sort();
}

// frontmatter scalar (same style as scripts/depth-audit/lessons.ts)
function fm(body, key) {
  return body.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1] ?? null;
}

async function loadTasks(practicePath) {
  let data;
  try {
    data = JSON.parse(await readFile(practicePath, "utf8"));
  } catch {
    return null; // missing or unparseable -> treat as no practice
  }
  return Array.isArray(data?.tasks) ? data.tasks : [];
}

async function main() {
  const gate = process.argv.includes("--gate");

  const lessons = []; // { lessonKey, track, unit, lesson, taskCount, tiers, missingTiers }
  for (const track of await subdirs(LESSONS_EN)) {
    for (const unit of await subdirs(join(LESSONS_EN, track))) {
      for (const slug of await subdirs(join(LESSONS_EN, track, unit))) {
        const mdxPath = join(LESSONS_EN, track, unit, slug, "index.mdx");
        const body = await readFile(mdxPath, "utf8").catch(() => null);
        if (body == null) continue;
        if (fm(body, "status") !== "ready") continue;

        const lessonKey = `${track}/${unit}/${slug}`;
        if (!isTeaching(lessonKey)) continue; // skip auxiliary scaffolds
        const tasks = await loadTasks(join(PRACTICE, track, unit, `${slug}.json`));
        const taskCount = tasks ? tasks.length : 0;
        const tierSet = new Set();
        for (const t of tasks ?? []) {
          if (TIERS.includes(t?.difficulty)) tierSet.add(t.difficulty);
        }
        const tiers = TIERS.filter((x) => tierSet.has(x));
        const missingTiers = TIERS.filter((x) => !tierSet.has(x));
        lessons.push({ lessonKey, track, unit, lesson: slug, taskCount, tiers, missingTiers });
      }
    }
  }

  const withPractice = lessons.filter((l) => l.taskCount > 0);
  const thin = lessons.filter(
    (l) => l.taskCount < MIN_TASKS || l.missingTiers.length > 0,
  );

  const worklist = thin
    .map((l) => {
      const reasons = [];
      if (l.taskCount < MIN_TASKS) reasons.push(`only ${l.taskCount} task(s) (<${MIN_TASKS})`);
      if (l.missingTiers.length) reasons.push(`missing tier(s): ${l.missingTiers.join(", ")}`);
      return {
        lessonKey: l.lessonKey,
        track: l.track,
        unit: l.unit,
        lesson: l.lesson,
        taskCount: l.taskCount,
        tiers: l.tiers,
        missingTiers: l.missingTiers,
        reason: reasons.join("; "),
      };
    })
    .sort((a, b) => a.lessonKey.localeCompare(b.lessonKey));

  // Per-track breakdown.
  const byTrack = new Map(); // track -> { total, thin }
  for (const l of lessons) {
    const b = byTrack.get(l.track) ?? { total: 0, thin: 0 };
    b.total++;
    byTrack.set(l.track, b);
  }
  for (const w of worklist) byTrack.get(w.track).thin++;

  await writeFile(OUT, JSON.stringify(worklist, null, 2) + "\n");

  // Summary to stdout.
  console.log("Practice-coverage audit");
  console.log(`  teaching ready EN lessons: ${lessons.length}`);
  console.log(`  with practice (>=1):   ${withPractice.length}`);
  console.log(`  THIN (<${MIN_TASKS} tasks or missing a tier): ${thin.length}`);
  console.log("");
  console.log("  Breakdown by track (thin / total):");
  for (const track of [...byTrack.keys()].sort()) {
    const b = byTrack.get(track);
    if (!b.thin) continue;
    console.log(`    ${track.padEnd(24)} ${String(b.thin).padStart(4)} / ${b.total}`);
  }
  console.log("");
  console.log(`  worklist -> ${OUT}`);

  if (gate) {
    if (thin.length) {
      console.error(`practice-coverage gate: ${thin.length} THIN lesson(s) remain.`);
      process.exit(1);
    }
    console.log("practice-coverage gate: OK — no THIN lessons.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
