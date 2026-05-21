import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { EXERCISE_COMPONENTS } from "./exercise-components";

const MATH_SECTIONS = ["hook", "goal", "worked-example", "check", "recap"] as const;
const ALGO_SECTIONS = ["hook", "goal", "idea", "code", "trace", "complexity", "check", "recap"] as const;
const BASECS_CODING_SECTIONS = ["hook", "goal", "idea", "code", "trace", "check", "recap"] as const;
const TOPIC_SECTIONS = ["hook", "crux", "explanation", "key-takeaway", "recap"] as const;
const ISLAND_COMPONENT_RE = /<astro-island[^>]*component-url="[^"]*\/([A-Za-z]+)\.[^"]+\.js"/g;

function countExerciseWidgets(html: string): number {
  let n = 0;
  const re = new RegExp(ISLAND_COMPONENT_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (EXERCISE_COMPONENTS.has(m[1])) n++;
  }
  return n;
}

function countRetrievalDrawers(html: string): number {
  const re = /<astro-island[^>]*component-url="[^"]*\/RetrievalDrawer\.[^"]+\.js"/g;
  return html.match(re)?.length ?? 0;
}

/** Built lesson page: dist/<lang>/learn/<track>/<lesson>/index.html — else null. */
function lessonInfoFromPath(file: string): { slug: string; track: string } | null {
  const seg = file.split(/[\\/]/).filter(Boolean);
  if (seg.length === 6 && seg[0] === "dist" && seg[2] === "learn" && seg[5].startsWith("index.")) {
    return { track: seg[3], slug: seg[4] };
  }
  return null;
}

function orderOf(slug: string): number {
  const m = slug.match(/^(\d{2})-/);
  return m ? Number(m[1]) : NaN;
}

/** First occurrence index of each data-lesson-section value. */
function sectionIndexes(html: string): Map<string, number> {
  const seen = new Map<string, number>();
  const re = /data-lesson-section="([a-z-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!seen.has(m[1])) seen.set(m[1], m.index);
  }
  return seen;
}

type OrderEntry = readonly [string, number | undefined];

function checkOrder(order: readonly OrderEntry[], file: string): string[] {
  const errs: string[] = [];
  let prev = -1;
  let prevName = "start";
  for (const [name, idx] of order) {
    if (idx === undefined) continue;
    if (idx < prev) errs.push(`${file}: lesson section "${name}" appears before "${prevName}"`);
    prev = idx;
    prevName = name;
  }
  return errs;
}

/** Rules every track shares: visual, practice count, hydration cap, forward links, sources. */
function commonLessonRules(html: string, file: string, slug: string, track: string): string[] {
  const errs: string[] = [];

  if (html.search(/data-lesson-visual\b/) < 0) errs.push(`${file}: lesson has no visual widget`);
  if (html.search(/data-practice-set\b/) < 0) {
    errs.push(`${file}: lesson skeleton missing practice (no PracticeSet)`);
  }

  const practiceBlock = html.match(/<section[^>]*data-practice-set[^>]*>([\s\S]*?)<\/section>/);
  if (practiceBlock) {
    const problems = practiceBlock[1].match(/data-practice-problem\b/g)?.length ?? 0;
    if (problems < 4) errs.push(`${file}: practice problems: ${problems} found (min 4)`);
  }

  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  if (islands > 5) errs.push(`${file}: ${islands} hydration islands (max 5 on lesson pages)`);

  // Forward link: only links within the same track to a higher-ordered lesson count.
  const thisOrder = orderOf(slug);
  const linkRe = /href="\/(?:en|ru)\/learn\/([a-z-]+)\/(\d{2}-[a-z0-9-]+)\/?"/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html))) {
    if (m[1] !== track) continue;
    const targetOrder = orderOf(m[2]);
    if (Number.isFinite(targetOrder) && Number.isFinite(thisOrder) && targetOrder > thisOrder) {
      errs.push(`${file}: forward link to higher-ordered lesson "${m[2]}"`);
    }
  }

  const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  if ((/Sources/i.test(footer) || /Источник/i.test(footer)) && !/href="https?:\/\//.test(footer)) {
    errs.push(`${file}: lesson sources footer has no external link`);
  }
  return errs;
}

function checkMathLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "math");
  const seen = sectionIndexes(html);
  for (const s of MATH_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
  }
  const stepIdx = html.search(/data-lesson-step\b/);
  if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
  const visualIdx = html.search(/data-lesson-visual\b/);
  const practiceIdx = html.search(/data-practice-set\b/);
  errs.push(
    ...checkOrder(
      [
        ["hook", seen.get("hook")],
        ["goal", seen.get("goal")],
        ["step", stepIdx >= 0 ? stepIdx : undefined],
        ["visual", visualIdx >= 0 ? visualIdx : undefined],
        ["worked-example", seen.get("worked-example")],
        ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
        ["check", seen.get("check")],
        ["recap", seen.get("recap")],
      ],
      file
    )
  );
  return errs;
}

function checkAlgoLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "algorithms");
  const seen = sectionIndexes(html);
  for (const s of ALGO_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: algorithm lesson missing "${s}" section`);
  }
  const practiceIdx = html.search(/data-practice-set\b/);
  errs.push(
    ...checkOrder(
      [
        ["hook", seen.get("hook")],
        ["goal", seen.get("goal")],
        ["idea", seen.get("idea")],
        ["code", seen.get("code")],
        ["trace", seen.get("trace")],
        ["complexity", seen.get("complexity")],
        ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
        ["check", seen.get("check")],
        ["recap", seen.get("recap")],
      ],
      file
    )
  );
  return errs;
}

function checkBaseCsLesson(html: string, file: string, slug: string): string[] {
  const errs = commonLessonRules(html, file, slug, "base-cs");
  const type = html.match(/data-lesson-type="(concept|coding)"/)?.[1];
  if (!type) {
    errs.push(`${file}: base-cs lesson has no lessonType (concept|coding)`);
    return errs;
  }
  const seen = sectionIndexes(html);
  const practiceIdx = html.search(/data-practice-set\b/);

  if (type === "concept") {
    for (const s of MATH_SECTIONS) {
      if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
    }
    const stepIdx = html.search(/data-lesson-step\b/);
    if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
    const visualIdx = html.search(/data-lesson-visual\b/);
    errs.push(
      ...checkOrder(
        [
          ["hook", seen.get("hook")],
          ["goal", seen.get("goal")],
          ["step", stepIdx >= 0 ? stepIdx : undefined],
          ["visual", visualIdx >= 0 ? visualIdx : undefined],
          ["worked-example", seen.get("worked-example")],
          ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
          ["check", seen.get("check")],
          ["recap", seen.get("recap")],
        ],
        file
      )
    );
  } else {
    for (const s of BASECS_CODING_SECTIONS) {
      if (!seen.has(s)) errs.push(`${file}: coding lesson missing "${s}" section`);
    }
    errs.push(
      ...checkOrder(
        [
          ["hook", seen.get("hook")],
          ["goal", seen.get("goal")],
          ["idea", seen.get("idea")],
          ["code", seen.get("code")],
          ["trace", seen.get("trace")],
          ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
          ["check", seen.get("check")],
          ["recap", seen.get("recap")],
        ],
        file
      )
    );
  }
  return errs;
}

function checkTopicLesson(html: string, file: string, slug: string): string[] {
  const errs: string[] = [];

  // Required sections present and in order
  const seen = sectionIndexes(html);
  for (const s of TOPIC_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: topic lesson missing "${s}" section`);
  }
  errs.push(
    ...checkOrder(
      [
        ["hook", seen.get("hook")],
        ["crux", seen.get("crux")],
        ["explanation", seen.get("explanation")],
        ["key-takeaway", seen.get("key-takeaway")],
        ["recap", seen.get("recap")],
      ],
      file
    )
  );

  // ≥1 visual widget
  if (html.search(/data-lesson-visual\b/) < 0) errs.push(`${file}: topic lesson has no visual widget`);

  // ≥2 exercise widgets
  const exerciseCount = countExerciseWidgets(html);
  if (exerciseCount < 2) errs.push(`${file}: topic lesson has ${exerciseCount} exercise widget(s) (min 2)`);

  // Exactly 1 RetrievalDrawer
  const drawerCount = countRetrievalDrawers(html);
  if (drawerCount !== 1) errs.push(`${file}: topic lesson must have exactly 1 RetrievalDrawer (found ${drawerCount})`);

  // ≤5 hydration islands
  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  if (islands > 5) errs.push(`${file}: ${islands} hydration islands (max 5 on lesson pages)`);

  return errs;
}

export function checkLessonRules(html: string, file: string): string[] {
  const info = lessonInfoFromPath(file);
  if (!info) return [];
  const lessonType = html.match(/data-lesson-type="([a-z]+)"/)?.[1];
  if (lessonType === "topic") return checkTopicLesson(html, file, info.slug);
  if (info.track === "algorithms") return checkAlgoLesson(html, file, info.slug);
  if (info.track === "base-cs") return checkBaseCsLesson(html, file, info.slug);
  return checkMathLesson(html, file, info.slug);
}

async function walkMdx(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try {
    items = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walkMdx(p)));
    else if (i.name === "index.mdx" || i.name === "index.md") out.push(p);
  }
  return out;
}

/** Source-level: every ready EN lesson has a ready RU twin and vice versa. */
export async function checkLessonParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walkMdx(lessonsDir);
  const enReady = new Set<string>();
  const ruReady = new Set<string>();

  for (const f of files) {
    const body = await readFile(f, "utf8");
    const lang = body.match(/^lang:\s*(en|ru)/m)?.[1];
    const status = body.match(/^status:\s*(stub|draft|ready)/m)?.[1];
    if (!lang || status !== "ready") continue;
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    const key = `${parts[idx + 2]}/${parts[idx + 3]}/${parts[idx + 4]}`;
    if (lang === "en") enReady.add(key);
    else ruReady.add(key);
  }
  for (const k of enReady) {
    if (!ruReady.has(k)) errs.push(`lesson-parity: EN ready lesson "${k}" missing RU twin`);
  }
  for (const k of ruReady) {
    if (!enReady.has(k)) errs.push(`lesson-parity: RU ready lesson "${k}" missing EN twin`);
  }
  return errs;
}

/** Source-level: every mathPrereqs entry resolves to an existing math lesson. */
export async function checkMathPrereqs(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const lessonsDir = join(siteSrc, "content/lessons");
  const files = await walkMdx(lessonsDir);

  const mathKeys = new Set<string>();
  for (const f of files) {
    const parts = f.split(/[\\/]/);
    const idx = parts.findIndex((p) => p === "lessons");
    if (parts[idx + 2] !== "math") continue;
    mathKeys.add(`math/${parts[idx + 3]}/${parts[idx + 4]}`);
  }

  for (const f of files) {
    const body = await readFile(f, "utf8");
    const fm = body.match(/^mathPrereqs:\s*\[([^\]]*)\]/m);
    if (!fm) continue;
    const refs = [...fm[1].matchAll(/["']([^"']+)["']/g)].map((r) => r[1]);
    for (const ref of refs) {
      if (!mathKeys.has(ref)) {
        errs.push(`math-prereq: "${f}" references missing math lesson "${ref}"`);
      }
    }
  }
  return errs;
}
