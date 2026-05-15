import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const REQUIRED_SECTIONS = ["hook", "goal", "worked-example", "check", "recap"] as const;

/** True only for built lesson pages: dist/<lang>/learn/<track>/<lesson>/index.html */
function lessonSlugFromPath(file: string): string | null {
  const seg = file.split(/[\\/]/).filter(Boolean);
  // ["dist", "en", "learn", "math", "01-counting", "index.html"]
  if (seg.length === 6 && seg[0] === "dist" && seg[2] === "learn" && seg[5].startsWith("index.")) {
    return seg[4];
  }
  return null;
}

function orderOf(slug: string): number {
  const m = slug.match(/^(\d{2})-/);
  return m ? Number(m[1]) : NaN;
}

export function checkLessonRules(html: string, file: string): string[] {
  const lessonSlug = lessonSlugFromPath(file);
  if (!lessonSlug) return [];
  const errs: string[] = [];

  // Rule 1: skeleton sections present and ordered.
  const seen = new Map<string, number>();
  const sectionRe = /data-lesson-section="([a-z-]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = sectionRe.exec(html))) {
    if (!seen.has(m[1])) seen.set(m[1], m.index);
  }
  const stepIdx = html.search(/data-lesson-step\b/);
  const visualIdx = html.search(/data-lesson-visual\b/);
  const practiceIdx = html.search(/data-practice-set\b/);

  for (const s of REQUIRED_SECTIONS) {
    if (!seen.has(s)) errs.push(`${file}: lesson skeleton missing "${s}" section`);
  }
  if (stepIdx < 0) errs.push(`${file}: lesson skeleton missing explanation (no Step component)`);
  if (visualIdx < 0) errs.push(`${file}: lesson has no visual widget`);
  if (practiceIdx < 0) errs.push(`${file}: lesson skeleton missing practice (no PracticeSet)`);

  // Ordering: hook < goal < step < visual < worked-example < practice < check < recap.
  const order = [
    ["hook", seen.get("hook")],
    ["goal", seen.get("goal")],
    ["step", stepIdx >= 0 ? stepIdx : undefined],
    ["visual", visualIdx >= 0 ? visualIdx : undefined],
    ["worked-example", seen.get("worked-example")],
    ["practice", practiceIdx >= 0 ? practiceIdx : undefined],
    ["check", seen.get("check")],
    ["recap", seen.get("recap")],
  ] as const;
  let prev = -1;
  let prevName = "start";
  for (const [name, idx] of order) {
    if (idx === undefined) continue;
    if (idx < prev) errs.push(`${file}: lesson section "${name}" appears before "${prevName}"`);
    prev = idx;
    prevName = name;
  }

  // Rule: >= 4 practice problems.
  const practiceBlock = html.match(/<section[^>]*data-practice-set[^>]*>([\s\S]*?)<\/section>/);
  if (practiceBlock) {
    const problems = practiceBlock[1].match(/data-practice-problem\b/g)?.length ?? 0;
    if (problems < 4) {
      errs.push(`${file}: practice problems: ${problems} found (min 4)`);
    }
  }

  // Rule: hydration cap 5.
  const islands = html.match(/<astro-island\b/g)?.length ?? 0;
  if (islands > 5) errs.push(`${file}: ${islands} hydration islands (max 5 on lesson pages)`);

  // Rule: no forward links to a higher-ordered lesson in the same track.
  const thisOrder = orderOf(lessonSlug);
  const linkRe = /href="\/(?:en|ru)\/learn\/[a-z-]+\/(\d{2}-[a-z0-9-]+)\/?"/g;
  while ((m = linkRe.exec(html))) {
    const targetOrder = orderOf(m[1]);
    if (Number.isFinite(targetOrder) && Number.isFinite(thisOrder) && targetOrder > thisOrder) {
      errs.push(`${file}: forward link to higher-ordered lesson "${m[1]}"`);
    }
  }

  // Rule: sources footer must carry an external link.
  const footer = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)?.[1] ?? "";
  if ((/Sources/i.test(footer) || /Источник/i.test(footer)) && !/href="https?:\/\//.test(footer)) {
    errs.push(`${file}: lesson sources footer has no external link`);
  }

  return errs;
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
    // .../lessons/<lang>/<track>/<unit>/<lesson>/index.mdx
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
