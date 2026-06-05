import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PARAMETRIC_COMPONENT_NAMES } from "../../components/pedagogy/parametric-registry";

const PARAMETRIC = new Set<string>(PARAMETRIC_COMPONENT_NAMES);
const UNTRANSLATED_MIN_LEN = 25; // only flag en===ru on prose-length fields

async function walkJson(dir: string): Promise<string[]> {
  let items: import("node:fs").Dirent[];
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return []; }
  const out: string[] = [];
  for (const i of items) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walkJson(p)));
    else if (i.name.endsWith(".json")) out.push(p);
  }
  return out;
}

async function readPractice(siteSrc: string): Promise<{ file: string; data: any }[]> {
  const dir = join(siteSrc, "content/practice");
  const files = await walkJson(dir);
  const out: { file: string; data: any }[] = [];
  for (const f of files) {
    try { out.push({ file: f, data: JSON.parse(await readFile(f, "utf8")) }); } catch { /* malformed handled by schema */ }
  }
  return out;
}

/** Fields whose en/ru content is legitimately language-neutral (machine output,
 *  EXPLAIN plans) — exempt from the en===ru equality check, never from whitespace. */
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

export async function checkPracticeParity(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  for (const { file, data } of await readPractice(siteSrc)) {
    for (const bt of biTexts(data, undefined)) {
      if (!bt.en.trim() || !bt.ru.trim()) errs.push(`practice-parity: "${file}" has a whitespace-only en/ru field`);
      else if (!LANG_NEUTRAL_FIELDS.has(bt.key ?? "") && bt.en.length >= UNTRANSLATED_MIN_LEN && bt.en.trim() === bt.ru.trim())
        errs.push(`practice-parity: "${file}" has an untranslated field (en === ru): "${bt.en.slice(0, 40)}…"`);
    }
  }
  return errs;
}

async function lessonKeys(siteSrc: string): Promise<{ en: Set<string>; ru: Set<string> }> {
  const en = new Set<string>(); const ru = new Set<string>();
  for (const langDir of ["en", "ru"] as const) {
    const base = join(siteSrc, "content/lessons", langDir);
    const files = await walkMdxKeys(base);
    for (const key of files) (langDir === "en" ? en : ru).add(key);
  }
  return { en, ru };
}

/** Returns "<track>/<unit>/<slug>" for each lesson under base. */
async function walkMdxKeys(base: string): Promise<string[]> {
  const out: string[] = [];
  async function rec(dir: string, parts: string[]) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      if (i.isDirectory()) await rec(join(dir, i.name), [...parts, i.name]);
      else if ((i.name === "index.mdx" || i.name === "index.md") && parts.length >= 3) {
        out.push(parts.slice(0, 3).join("/"));
      }
    }
  }
  await rec(base, []);
  return out;
}

export async function checkPracticeLessonKey(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  const { en, ru } = await lessonKeys(siteSrc);
  for (const { file, data } of await readPractice(siteSrc)) {
    const key = data?.lessonKey;
    if (typeof key !== "string" || !en.has(key) || !ru.has(key)) {
      errs.push(`practice-lessonkey: "${file}" lessonKey "${key}" has no matching EN+RU lesson`);
    }
    for (const task of data?.tasks ?? []) {
      if (task?.type === "sandbox" && task?.runtime === "parametric") {
        const name = task?.parametric?.component;
        if (!name || !PARAMETRIC.has(name)) {
          errs.push(`practice-lessonkey: "${file}" task "${task?.id}" references unknown parametric component "${name}"`);
        }
      }
    }
  }
  return errs;
}

/** Every `review` task must carry at least one finding (the grading key).
 *  Zod already enforces this, but the lint layer asserts it for a clear,
 *  human-readable build error. */
export async function checkPracticeReview(siteSrc: string): Promise<string[]> {
  const errs: string[] = [];
  for (const { file, data } of await readPractice(siteSrc)) {
    for (const task of data?.tasks ?? []) {
      if (task?.type !== "review") continue;
      if ((task?.findings?.length ?? 0) < 1) {
        errs.push(`practice-review: "${file}" task "${task?.id}" must have at least one finding`);
      }
    }
  }
  return errs;
}

/** Tracks flipped to error (lesson without a 3–5 task practice file fails the build).
 *  Empty in P1 — everything is a warning. Add track slugs here as a track is filled. */
export const PRACTICE_REQUIRED_TRACKS: string[] = ["networking", "algorithms", "observability", "performance", "base-cs", "browser", "backend", "databases", "math", "engineering-practice", "apis", "caching", "distributed", "frontend", "queues", "security", "ai-llm", "data-engineering", "deployment", "system-design", "system-design-cases"];

/** Assessment pseudo-lessons (quiz/project/drill blocks) carry their own format,
 *  and `00-start-here` orientation lessons are roadmaps with no mechanism to drill
 *  — neither is asked for a practice file. */
const PSEUDO_LESSON = /^(quiz(-[a-z]+)?|project|drill)$/;
function isPseudoLesson(key: string): boolean {
  const [, unit, slug] = key.split("/");
  return unit === "00-start-here" || PSEUDO_LESSON.test(slug ?? "");
}

export async function checkPracticeCount(siteSrc: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = []; const warnings: string[] = [];
  // ready EN lessons → "<track>/<unit>/<slug>"
  const readyKeys: string[] = [];
  const base = join(siteSrc, "content/lessons", "en");
  async function rec(dir: string, parts: string[]) {
    let items: import("node:fs").Dirent[];
    try { items = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const i of items) {
      if (i.isDirectory()) await rec(join(dir, i.name), [...parts, i.name]);
      else if ((i.name === "index.mdx" || i.name === "index.md") && parts.length >= 3) {
        const body = await readFile(join(dir, i.name), "utf8");
        if (/^status:\s*ready/m.test(body)) readyKeys.push(parts.slice(0, 3).join("/"));
      }
    }
  }
  await rec(base, []);

  const practiceByKey = new Map<string, any>();
  for (const { data } of await readPractice(siteSrc)) if (data?.lessonKey) practiceByKey.set(data.lessonKey, data);

  for (const key of readyKeys) {
    if (isPseudoLesson(key)) continue; // quiz/project/drill blocks don't take practice files
    const track = key.split("/")[0];
    const required = PRACTICE_REQUIRED_TRACKS.includes(track);
    const data = practiceByKey.get(key);
    const count = data?.tasks?.length ?? 0;
    let msg: string | null = null;
    if (!data) msg = `practice-count: ready lesson "${key}" has no practice file`;
    else if (count < 3 || count > 5) msg = `practice-count: lesson "${key}" has ${count} tasks (want 3–5)`;
    if (msg) (required ? errors : warnings).push(msg);
  }
  return { errors, warnings };
}

/** HTML-level: at most one PracticeSection island per lesson page, never client:load. */
export function checkPracticeSandboxBudget(html: string, file: string): string[] {
  const norm = file.replace(/\\/g, "/");
  const isLesson = /\/dist\/(en|ru)\/learn\/.+\/index\.html$/.test(norm);
  if (!isLesson) return [];
  // The Mastery Lab is a dedicated practice hub: one PracticeSection per tier is
  // its purpose. Exempt it from the single-island cap, but keep the client:load ban.
  const isLab = /\/dist\/(en|ru)\/learn\/[^/]+\/lab\/index\.html$/.test(norm);
  const errs: string[] = [];

  const markers = html.match(/data-practice-layer\b/g)?.length ?? 0;
  if (!isLab && markers > 1) errs.push(`${file}: at most one PracticeSection per page (found ${markers})`);

  const islandRe = /<astro-island\b[^>]*component-url="[^"]*\/PracticeSection\.[^"]+\.js"[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = islandRe.exec(html))) {
    if (/client="load"/.test(m[0])) errs.push(`${file}: PracticeSection must not be an eager (client:load) island`);
  }
  return errs;
}
