#!/usr/bin/env bun
// Generated lesson read-model for graph-aware recommendations.
// Source of truth stays in lesson frontmatter + concepts.json + units.json.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveConnections } from "../../src/scripts/connections-index.ts";

const LESSONS_EN = "src/content/lessons/en";
const LESSONS_RU = "src/content/lessons/ru";
const CONCEPTS = "src/content/path/concepts.json";
const UNITS = "src/content/units.json";
const OUT = "src/content/path/lesson-graph.json";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name === "index.mdx") out.push(p);
  }
  return out;
}

export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { scalars: {}, lists: {} };
  const scalars = {};
  const lists = {};
  let current = null;
  for (const line of m[1].split("\n")) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item && current) {
      lists[current].push(item[1].trim().replace(/^['"]|['"]$/g, ""));
      continue;
    }
    const kv = line.match(/^([A-Za-z_][\w]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, raw] = kv;
    const value = raw.trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      lists[key] = inner
        ? inner.split(",").map((item) => item.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean)
        : [];
      scalars[key] = value;
      current = null;
    } else if (value === "") {
      current = key;
      lists[key] = [];
    } else {
      current = null;
      scalars[key] = value.replace(/^['"]|['"]$/g, "");
    }
  }
  return { scalars, lists };
}

function descriptor(text) {
  const { scalars, lists } = parseFrontmatter(text);
  const { track, unit, slug } = scalars;
  if (!track || !unit || !slug) return null;
  return {
    key: `${track}/${unit}/${slug}`,
    track,
    unit,
    slug,
    order: Number(scalars.order) || 0,
    level: scalars.level ?? "junior",
    concepts: lists.concepts ?? [],
    prereqs: [...(lists.prereqs ?? []), ...(lists.mathPrereqs ?? [])],
    connectionPrereqs: lists.prereqs ?? [],
    deepensInto: lists.deepensInto ?? [],
    spiral: lists.spiral ?? [],
  };
}

function ancestorClosure(conceptIds, requiresByConcept) {
  const seen = new Set();
  const stack = conceptIds.flatMap((id) => requiresByConcept.get(id) ?? []);
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const parent of requiresByConcept.get(id) ?? []) stack.push(parent);
  }
  for (const id of conceptIds) seen.delete(id);
  return [...seen].sort();
}

function resolveLessonRef(ref, lesson, ids) {
  const parts = ref.split("/");
  const key = parts.length === 3
    ? ref
    : parts.length === 2
      ? `${lesson.track}/${ref}`
      : `${lesson.track}/${lesson.unit}/${ref}`;
  return ids.has(key) ? key : null;
}

export function buildLessonGraph({ lessons, concepts, units, relatedLimit = 8 }) {
  const counts = new Map();
  for (const lesson of lessons) counts.set(lesson.key, (counts.get(lesson.key) ?? 0) + 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([key]) => key).sort();
  if (duplicates.length) {
    throw new Error(`duplicate lesson key(s): ${duplicates.join(", ")}`);
  }
  const byKey = new Map(lessons.map((lesson) => [lesson.key, lesson]));
  const ids = new Set(byKey.keys());
  const requiresByConcept = new Map(concepts.map((c) => [c.id, c.requires ?? []]));
  const knownConcepts = new Set(requiresByConcept.keys());
  const connections = resolveConnections(lessons.map((lesson) => ({
    id: lesson.key,
    track: lesson.track,
    unit: lesson.unit,
    order: lesson.order ?? 0,
    level: lesson.level ?? "junior",
    prereqs: lesson.connectionPrereqs ?? lesson.prereqs ?? [],
    deepensInto: lesson.deepensInto ?? [],
    spiral: lesson.spiral ?? [],
  })));

  const prev = new Map();
  const next = new Map();
  const navPrev = new Map();
  const navNext = new Map();
  for (const unit of units) {
    const keys = (unit.lessons ?? [])
      .map((slug) => `${unit.id}/${slug}`)
      .filter((key) => ids.has(key));
    for (let i = 0; i < keys.length; i++) {
      prev.set(keys[i], keys[i - 1] ?? null);
      next.set(keys[i], keys[i + 1] ?? null);
    }
  }
  const unitsByTrack = new Map();
  for (const unit of units) {
    const track = unit.track ?? String(unit.id ?? "").split("/")[0];
    const arr = unitsByTrack.get(track) ?? [];
    arr.push(unit);
    unitsByTrack.set(track, arr);
  }
  for (const trackUnits of unitsByTrack.values()) {
    const keys = [...trackUnits]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .flatMap((unit) => (unit.lessons ?? [])
        .map((slug) => `${unit.id}/${slug}`)
        .filter((key) => ids.has(key)));
    for (let i = 0; i < keys.length; i++) {
      navPrev.set(keys[i], keys[i - 1] ?? null);
      navNext.set(keys[i], keys[i + 1] ?? null);
    }
  }

  const lessonsByConcept = new Map();
  for (const lesson of lessons) {
    for (const concept of lesson.concepts) {
      if (!knownConcepts.has(concept)) continue;
      const arr = lessonsByConcept.get(concept) ?? [];
      arr.push(lesson.key);
      lessonsByConcept.set(concept, arr);
    }
  }

  const out = {};
  for (const lesson of [...lessons].sort((a, b) => a.key.localeCompare(b.key))) {
    const conceptsKnown = lesson.concepts.filter((id) => knownConcepts.has(id));
    const prereqLessons = [...new Set(lesson.prereqs
      .map((ref) => resolveLessonRef(ref, lesson, ids))
      .filter(Boolean))].sort();

    const relatedScores = new Map();
    for (const concept of conceptsKnown) {
      for (const otherKey of lessonsByConcept.get(concept) ?? []) {
        if (otherKey === lesson.key) continue;
        const other = byKey.get(otherKey);
        if (!other || other.track === lesson.track) continue;
        relatedScores.set(otherKey, (relatedScores.get(otherKey) ?? 0) + 1);
      }
    }
    const related = [...relatedScores]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, relatedLimit)
      .map(([key]) => key);
    const connection = connections[lesson.key] ?? {
      buildsOn: [],
      unlocks: [],
      deepensInto: [],
      appearsAgainIn: [],
    };

    out[lesson.key] = {
      concepts: conceptsKnown,
      prereqConcepts: ancestorClosure(conceptsKnown, requiresByConcept),
      prereqLessons,
      prev: prev.get(lesson.key) ?? null,
      next: next.get(lesson.key) ?? null,
      navPrev: navPrev.get(lesson.key) ?? null,
      navNext: navNext.get(lesson.key) ?? null,
      related,
      buildsOn: connection.buildsOn,
      unlocks: connection.unlocks,
      deepensInto: connection.deepensInto,
      appearsAgainIn: [...new Set([...connection.appearsAgainIn, ...related])],
    };
  }
  return out;
}

export function auditLessonGraph({ lessons, localizedLessons, concepts, graph }) {
  const knownConcepts = new Set(concepts.map((c) => c.id));
  const lessonIds = new Set(lessons.map((lesson) => lesson.key));
  const localizedByKey = new Map(localizedLessons.map((lesson) => [lesson.key, lesson]));
  const parityMismatches = [];
  const unknownConceptRefs = [];
  const emptyConceptNodes = [];
  const danglingLessonRefs = [];

  for (const lesson of lessons) {
    const localized = localizedByKey.get(lesson.key);
    if (!localized || JSON.stringify(localized.concepts) !== JSON.stringify(lesson.concepts)) {
      parityMismatches.push(lesson.key);
    }
    for (const concept of lesson.concepts) {
      if (!knownConcepts.has(concept)) unknownConceptRefs.push({ lesson: lesson.key, concept });
    }
    if (!(graph[lesson.key]?.concepts?.length > 0)) emptyConceptNodes.push(lesson.key);
  }

  for (const [lesson, node] of Object.entries(graph)) {
    for (const ref of [
      node.prev,
      node.next,
      node.navPrev,
      node.navNext,
      ...(node.prereqLessons ?? []),
      ...(node.related ?? []),
      ...(node.buildsOn ?? []),
      ...(node.unlocks ?? []),
      ...(node.deepensInto ?? []),
      ...(node.appearsAgainIn ?? []),
    ]) {
      if (ref && !lessonIds.has(ref)) danglingLessonRefs.push({ lesson, ref });
    }
  }

  return { parityMismatches, unknownConceptRefs, emptyConceptNodes, danglingLessonRefs };
}

function loadLessons(dir) {
  return walk(dir).sort().flatMap((file) => {
    const lesson = descriptor(readFileSync(file, "utf8"));
    return lesson ? [lesson] : [];
  });
}

if (import.meta.main) {
  // Corpus-stripped environments (CI without the lesson mirrors): keep the
  // tracked artifact instead of crashing, but require it to exist.
  if (!existsSync(LESSONS_EN) || !existsSync(LESSONS_RU)) {
    if (existsSync(OUT)) {
      console.log(`lesson-graph: corpus external; keeping tracked ${OUT}`);
    } else {
      console.error(`lesson-graph: corpus external and ${OUT} missing; cannot build`);
      process.exitCode = 1;
    }
  } else {
  const en = loadLessons(LESSONS_EN);
  const ru = loadLessons(LESSONS_RU);
  const concepts = JSON.parse(readFileSync(CONCEPTS, "utf8"));
  const units = JSON.parse(readFileSync(UNITS, "utf8"));
  const graph = buildLessonGraph({ lessons: en, concepts, units });
  writeFileSync(OUT, JSON.stringify(graph) + "\n");

  const audit = auditLessonGraph({ lessons: en, localizedLessons: ru, concepts, graph });
  const relatedEdges = Object.values(graph).reduce((n, node) => n + node.related.length, 0);
  const prereqEdges = Object.values(graph).reduce((n, node) => n + node.prereqLessons.length, 0);
  console.log(`lesson-graph.json: ${Object.keys(graph).length} lessons, ${prereqEdges} explicit prereq edges, ${relatedEdges} cross-track related edges → ${OUT}`);
  if (audit.parityMismatches.length) {
    console.error(`lesson-graph: ${audit.parityMismatches.length} EN/RU concept-list mismatches`);
  }
  if (audit.unknownConceptRefs.length) {
    console.error(`lesson-graph: ${audit.unknownConceptRefs.length} authored EN concept refs are missing from concepts.json`);
  }
  if (audit.emptyConceptNodes.length) {
    console.error(`lesson-graph: ${audit.emptyConceptNodes.length} lessons have no canonical concepts`);
  }
  if (audit.danglingLessonRefs.length) {
    console.error(`lesson-graph: ${audit.danglingLessonRefs.length} dangling authored lesson prerequisite refs`);
  }
  if (audit.parityMismatches.length || audit.unknownConceptRefs.length || audit.emptyConceptNodes.length || audit.danglingLessonRefs.length) {
    process.exitCode = 1;
  }
  }
}
