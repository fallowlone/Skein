// @vitest-environment node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;

function lessonPayloadFunction(schema: string): string {
  const start = schema.indexOf("create or replace function curriculum.get_lesson_payload");
  const end = schema.indexOf("\n$$;", start);
  if (start < 0 || end < 0) throw new Error("get_lesson_payload SQL not found");
  return schema.slice(start, end + 4);
}

describe("curriculum.get_lesson_payload SQL contract", () => {
  beforeAll(async () => {
    const schema = await readFile(resolve(process.cwd(), "../supabase/schema.sql"), "utf8");
    const tablesEnd = schema.indexOf("-- Row-level security:");
    if (tablesEnd < 0) throw new Error("schema table boundary not found");

    db = new PGlite();
    await db.exec(schema.slice(schema.indexOf("create schema if not exists curriculum;"), tablesEnd));
    await db.exec(lessonPayloadFunction(schema));
    await db.exec(`
      insert into curriculum.tracks (slug, data, content_hash) values
        ('backend', '{"slug":"backend","title":{"en":"Backend","ru":"Бэкенд"}}', 'track-v1');
      insert into curriculum.units (track, slug, data, content_hash) values
        ('backend', '01-unit', '{"slug":"01-unit","title":{"en":"Unit","ru":"Юнит"}}', 'unit-v1');
      insert into curriculum.concepts (id, data, content_hash) values
        ('c0', '{"label":{"en":"Prerequisite","ru":"Предпосылка"}}', 'c0-v1'),
        ('c1', '{"label":{"en":"Concept","ru":"Концепт"}}', 'c1-v1');
      insert into curriculum.lessons
        (lang, track, unit, slug, order_no, title, summary, est_min, status, meta, body, body_hash, render_tree, render_hash, content_hash)
      values
        ('en', 'backend', '01-unit', '01-overview', 1, 'Overview', 'EN summary', 10, 'ready',
          '{"concepts":["c1"],"sources":["https://example.com"],"prereqs":[],"mathPrereqs":[]}',
          '# source', 'body-en-v1', '{"format":"lesson-render-tree-v1","root":[{"type":"text","value":"Hello"}]}', 'render-en-v1', 'lesson-en-v1'),
        ('ru', 'backend', '01-unit', '01-overview', 1, 'Обзор', 'RU summary', 10, 'ready',
          '{"concepts":["c1"],"sources":["https://example.com"],"prereqs":[],"mathPrereqs":[]}',
          '# source', 'body-ru-v1', '{"format":"lesson-render-tree-v1","root":[{"type":"text","value":"Привет"}]}', 'render-ru-v1', 'lesson-ru-v1'),
        ('en', 'backend', '01-unit', '02-next', 2, 'Next lesson', '', 8, 'ready', '{}', '# next', 'next-en-body', null, null, 'next-en-v1'),
        ('ru', 'backend', '01-unit', '02-next', 2, 'Следующий урок', '', 8, 'ready', '{}', '# next', 'next-ru-body', null, null, 'next-ru-v1');
      insert into curriculum.practice (lesson_key, track, data, content_hash) values
        ('backend/01-unit/01-overview', 'backend', '{"tasks":[{"id":"p1"}]}', 'practice-v1');
      insert into curriculum.drill (track, unit, data, content_hash) values
        ('backend', '01-unit', '{"track":"backend","unit":"01-unit","intro":{"en":"Drill","ru":"Дрилл"},"problems":[{"id":"d1"}]}', 'drill-v1');
      insert into curriculum.lesson_graph (lesson_key, track, unit, slug, data, content_hash) values
        ('backend/01-unit/01-overview', 'backend', '01-unit', '01-overview',
          '{"concepts":["c1"],"prereqConcepts":["c0"],"prereqLessons":[],"prev":null,"next":"backend/01-unit/02-next","navPrev":null,"navNext":"backend/01-unit/02-next","related":[],"buildsOn":[],"unlocks":[],"deepensInto":[],"appearsAgainIn":[]}',
          'graph-v1');
      insert into curriculum.projects (slug, data, content_hash) values
        ('project-one', '{"title":{"en":"Project One","ru":"Проект Один"},"pitch":{"en":"Build it","ru":"Собери"},"milestones":[{"feedsFrom":["backend/01-unit/01-overview"]}]}', 'project-v1');
    `);
  });

  afterAll(async () => {
    await db?.close();
  });

  async function read(lang: "en" | "ru", slug = "01-overview") {
    return db.query<{ payload: Record<string, any>; version: string }>(
      "select payload, version from curriculum.get_lesson_payload($1, $2, $3, $4)",
      [lang, "backend", "01-unit", slug],
    );
  }

  it("returns the bounded EN/RU runtime payload and missing as zero rows", async () => {
    const en = (await read("en")).rows[0]!;
    expect(en.payload.lesson.title).toBe("Overview");
    expect(en.payload.lesson.body.format).toBe("lesson-render-tree-v1");
    expect(en.payload.practice.tasks[0].id).toBe("p1");
    expect(en.payload.drill.problems[0].id).toBe("d1");
    expect(Object.keys(en.payload.concepts).sort()).toEqual(["c0", "c1"]);
    expect(en.payload.lessonMeta["backend/01-unit/02-next"].title).toBe("Next lesson");
    expect(en.payload.projects).toEqual([{ slug: "project-one", title: "Project One", pitch: "Build it" }]);
    expect(en.payload.version).toBe(en.version);

    const ru = (await read("ru")).rows[0]!;
    expect(ru.payload.lesson.title).toBe("Обзор");
    expect(ru.payload.lessonMeta["backend/01-unit/02-next"].title).toBe("Следующий урок");
    expect(ru.payload.projects[0].title).toBe("Проект Один");
    expect((await read("en", "missing")).rows).toHaveLength(0);
  });

  it("invalidates the payload version when drill content changes", async () => {
    const before = (await read("en")).rows[0]!.version;
    await db.exec("update curriculum.drill set content_hash = 'drill-v2' where track = 'backend' and unit = '01-unit'");
    const after = (await read("en")).rows[0]!.version;
    expect(after).not.toBe(before);
  });
});
