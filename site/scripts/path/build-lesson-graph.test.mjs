import { describe, expect, it } from "vitest";
import { auditLessonGraph, buildLessonGraph, parseFrontmatter } from "./build-lesson-graph.mjs";

describe("buildLessonGraph", () => {
  it("parses inline YAML arrays used by lessons and drills", () => {
    const parsed = parseFrontmatter(`---\nslug: drill\nconcepts: [graphs, bfs, 'topological-sort']\n---\n`);
    expect(parsed.lists.concepts).toEqual(["graphs", "bfs", "topological-sort"]);
  });

  it("connects every lesson to concepts, prerequisites, sequence, and cross-track reuse", () => {
    const lessons = [
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", order: 1, level: "junior", concepts: ["base"], prereqs: [], deepensInto: [], spiral: ["shared"] },
      { key: "a/01-u/02-child", track: "a", unit: "01-u", slug: "02-child", order: 2, level: "middle", concepts: ["child"], prereqs: ["01-base"], deepensInto: [], spiral: [] },
      { key: "b/01-v/01-reuse", track: "b", unit: "01-v", slug: "01-reuse", order: 1, level: "junior", concepts: ["base"], prereqs: [], deepensInto: [], spiral: ["shared"] },
    ];
    const concepts = [
      { id: "base", requires: [] },
      { id: "child", requires: ["base"] },
    ];
    const units = [
      { id: "a/01-u", lessons: ["01-base", "02-child"] },
      { id: "b/01-v", lessons: ["01-reuse"] },
    ];

    const graph = buildLessonGraph({ lessons, concepts, units });
    expect(Object.keys(graph)).toHaveLength(3);
    expect(graph["a/01-u/02-child"]).toMatchObject({
      concepts: ["child"],
      prereqConcepts: ["base"],
      prereqLessons: ["a/01-u/01-base"],
      buildsOn: ["a/01-u/01-base"],
      prev: "a/01-u/01-base",
      next: null,
    });
    expect(graph["a/01-u/01-base"].next).toBe("a/01-u/02-child");
    expect(graph["a/01-u/01-base"].unlocks).toEqual(["a/01-u/02-child"]);
    expect(graph["a/01-u/01-base"].deepensInto).toEqual(["a/01-u/02-child"]);
    expect(graph["a/01-u/01-base"].related).toEqual(["b/01-v/01-reuse"]);
    expect(graph["a/01-u/01-base"].appearsAgainIn).toEqual(["b/01-v/01-reuse"]);
  });

  it("resolves same-track cross-unit prerequisite refs", () => {
    const lessons = [
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", concepts: ["base"], prereqs: [] },
      { key: "a/02-v/01-child", track: "a", unit: "02-v", slug: "01-child", concepts: ["child"], prereqs: ["01-u/01-base"] },
    ];
    const graph = buildLessonGraph({
      lessons,
      concepts: [{ id: "base", requires: [] }, { id: "child", requires: ["base"] }],
      units: [
        { id: "a/01-u", track: "a", order: 1, lessons: ["01-base"] },
        { id: "a/02-v", track: "a", order: 2, lessons: ["01-child"] },
      ],
    });
    expect(graph["a/02-v/01-child"].prereqLessons).toEqual(["a/01-u/01-base"]);
    expect(graph["a/01-u/01-base"].next).toBeNull();
    expect(graph["a/01-u/01-base"].navNext).toBe("a/02-v/01-child");
    expect(graph["a/02-v/01-child"].navPrev).toBe("a/01-u/01-base");
  });

  it("audits parity, unknown concepts, and empty graph nodes", () => {
    const lessons = [
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", concepts: ["base"], prereqs: [] },
      { key: "a/01-u/02-bad", track: "a", unit: "01-u", slug: "02-bad", concepts: ["missing"], prereqs: [] },
    ];
    const localizedLessons = [
      { ...lessons[0] },
      { ...lessons[1], concepts: ["localized-id"] },
    ];
    const concepts = [{ id: "base", requires: [] }];
    const graph = buildLessonGraph({ lessons, concepts, units: [{ id: "a/01-u", lessons: ["01-base", "02-bad"] }] });
    const audit = auditLessonGraph({ lessons, localizedLessons, concepts, graph });
    expect(audit.parityMismatches).toEqual(["a/01-u/02-bad"]);
    expect(audit.unknownConceptRefs).toEqual([{ lesson: "a/01-u/02-bad", concept: "missing" }]);
    expect(audit.emptyConceptNodes).toEqual(["a/01-u/02-bad"]);
    expect(audit.danglingLessonRefs).toEqual([]);
  });

  it("rejects duplicate lesson ids before a Map can silently shadow one", () => {
    const lessons = [
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", concepts: ["base"], prereqs: [] },
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", concepts: ["base"], prereqs: [] },
    ];
    expect(() => buildLessonGraph({
      lessons,
      concepts: [{ id: "base", requires: [] }],
      units: [{ id: "a/01-u", lessons: ["01-base"] }],
    })).toThrow(/duplicate lesson key/);
  });

  it("audits dangling references in the generated graph", () => {
    const lessons = [
      { key: "a/01-u/01-base", track: "a", unit: "01-u", slug: "01-base", concepts: ["base"], prereqs: [] },
    ];
    const concepts = [{ id: "base", requires: [] }];
    const graph = buildLessonGraph({ lessons, concepts, units: [{ id: "a/01-u", lessons: ["01-base"] }] });
    graph["a/01-u/01-base"].related = ["b/99-v/99-missing"];
    const audit = auditLessonGraph({ lessons, localizedLessons: lessons, concepts, graph });
    expect(audit.danglingLessonRefs).toEqual([
      { lesson: "a/01-u/01-base", ref: "b/99-v/99-missing" },
    ]);
  });
});
