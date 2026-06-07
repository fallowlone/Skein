import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";
import type { LessonRef, Level, Status, UnitRef } from "./types";

async function subdirs(dir: string): Promise<string[]> {
  const items = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return items.filter((i) => i.isDirectory()).map((i) => i.name).sort();
}
async function exists(p: string): Promise<boolean> {
  return access(p).then(() => true, () => false);
}
function fm(body: string, key: string): string | null {
  // frontmatter scalar only (matches the regex style of src/lint/rules/i18n-parity.ts)
  return body.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, "m"))?.[1] ?? null;
}

/** siteSrc = the directory that contains `content/` (i.e. `site/src` in prod). */
export async function enumerateUnits(siteSrc: string): Promise<UnitRef[]> {
  const root = join(siteSrc, "content/lessons/en");
  const units: UnitRef[] = [];
  for (const track of await subdirs(root)) {
    for (const unit of await subdirs(join(root, track))) {
      const unitKey = `${track}/${unit}`;
      const lessons: LessonRef[] = [];
      for (const slug of await subdirs(join(root, track, unit))) {
        const path = join(root, track, unit, slug, "index.mdx");
        const body = await readFile(path, "utf8").catch(() => null);
        if (body == null) continue;
        const status = (fm(body, "status") ?? "stub") as Status;
        const levelRaw = fm(body, "level");
        const level = (levelRaw as Level | null) ?? null;
        const practicePath = join(siteSrc, "content/practice", track, unit, `${slug}.json`);
        lessons.push({
          lessonKey: `${track}/${unit}/${slug}`, track, unitKey, slug,
          status, level, path,
          practicePath: (await exists(practicePath)) ? practicePath : null,
        });
      }
      if (lessons.length) units.push({ unitKey, track, unit, lessons });
    }
  }
  return units.sort((a, b) => a.unitKey.localeCompare(b.unitKey));
}
