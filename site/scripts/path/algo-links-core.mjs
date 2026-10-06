/**
 * Pure core for the algorithm<->lesson link index (hybrid derived + curated).
 * No I/O here: the shell (`build-algo-links.mjs`) loads inputs and writes output.
 *
 * Index shape (committed as `algo-links.json`):
 * {
 *   _note: "GENERATED ...",
 *   units:   { "<algoUnit>": [{ lesson, shared, canonical }] },
 *   lessons: { "<lessonKey>": [{ unit, shared, canonical }] }
 * }
 */

export const ALGO_TRACK = "algorithms";
export const MIN_SHARED = 2;
export const CAP_PER_ALGO = 12;
export const CAP_PER_LESSON = 6;

const CURATED_KINDS = new Set(["always", "never"]);

/**
 * @param {object} args
 * @param {Record<string, { teaches?: string[] }>} args.unitConcepts
 * @param {Record<string, string[]>} args.lessonConcepts
 * @param {string[]} [args.lessonOrder] canonical lesson order for tie-breaks
 * @param {string[] | Set<string>} [args.knownConceptIds] from concepts.json
 * @returns {{ derived: Record<string, Array<{lesson: string, shared: number, concepts: string[]}>>, warnings: string[] }}
 */
export function computeDerived({ unitConcepts, lessonConcepts, lessonOrder = [], knownConceptIds = null }) {
  const known = knownConceptIds ? new Set(knownConceptIds) : null;
  const warnings = [];
  const rank = new Map(lessonOrder.map((k, i) => [k, i]));

  const cleanConcepts = (ids, where) => {
    const out = [];
    for (const id of ids ?? []) {
      if (known && !known.has(id)) {
        warnings.push(`unknown concept "${id}" in ${where}`);
        continue;
      }
      if (!out.includes(id)) out.push(id);
    }
    return out;
  };

  const lessons = Object.entries(lessonConcepts).map(([lesson, ids]) => ({
    lesson,
    concepts: cleanConcepts(ids, `lesson ${lesson}`),
  }));

  const derived = {};
  for (const [unit, entry] of Object.entries(unitConcepts)) {
    if (!unit.startsWith(`${ALGO_TRACK}/`)) continue;
    const teaches = cleanConcepts(entry?.teaches, `unit ${unit}`);
    const hits = [];
    for (const { lesson, concepts } of lessons) {
      const shared = concepts.filter((c) => teaches.includes(c));
      if (shared.length >= MIN_SHARED) hits.push({ lesson, shared: shared.length, concepts: shared });
    }
    // Cross-track links are scarce and carry the spec goal, so they win ties
    // at equal shared counts, ahead of lesson order.
    const cross = (lesson) => (lesson.startsWith(`${ALGO_TRACK}/`) ? 1 : 0);
    hits.sort(
      (a, b) =>
        b.shared - a.shared ||
        cross(a.lesson) - cross(b.lesson) ||
        (rank.get(a.lesson) ?? Infinity) - (rank.get(b.lesson) ?? Infinity),
    );
    derived[unit] = hits;
  }
  // Deterministic key order.
  return { derived: Object.fromEntries(Object.entries(derived).sort(([a], [b]) => (a < b ? -1 : 1))), warnings };
}

/**
 * @param {Record<string, Array<{lesson: string, shared: number}>>} derived
 * @param {Array<{algo: string, lesson: string, kind: "always" | "never", note?: string}>} curated
 * @returns {{ index: Record<string, Array<{lesson: string, shared: number, canonical: boolean}>>, warnings: string[] }}
 */
export function applyCurated(derived, curated) {
  const warnings = [];
  const index = Object.fromEntries(
    Object.entries(derived).map(([unit, hits]) => [
      unit,
      hits.map((h) => ({ lesson: h.lesson, shared: h.shared, canonical: false })),
    ]),
  );
  (curated ?? []).forEach((entry, i) => {
    const where = `curated[${i}]`;
    if (!entry || typeof entry !== "object" || !CURATED_KINDS.has(entry.kind)) {
      throw new Error(`${where}: unknown kind ${JSON.stringify(entry?.kind)} (want "always" | "never")`);
    }
    if (typeof entry.algo !== "string" || typeof entry.lesson !== "string") {
      throw new Error(`${where}: "algo" and "lesson" must be strings`);
    }
    const list = index[entry.algo] ?? (index[entry.algo] = []);
    const at = list.findIndex((e) => e.lesson === entry.lesson);
    if (entry.kind === "never") {
      if (at >= 0) list.splice(at, 1);
      else warnings.push(`${where}: "never" matches no derived link (${entry.algo} <- ${entry.lesson})`);
    } else {
      if (at >= 0) list[at] = { ...list[at], canonical: true };
      else list.unshift({ lesson: entry.lesson, shared: 0, canonical: true });
    }
  });
  // Canonical first, then by shared count. Stable sort keeps insertion order otherwise.
  for (const list of Object.values(index)) {
    list.sort((a, b) => Number(b.canonical) - Number(a.canonical) || b.shared - a.shared);
  }
  return { index, warnings };
}

/**
 * @param {object} args same as computeDerived plus:
 * @param {Array} [args.curated]
 * @returns {{ index: { units: Record<string, unknown[]>, lessons: Record<string, unknown[]> }, coverage: { units: number, withLinks: number, zeroLink: string[] } }}
 */
export function buildIndex({ unitConcepts, lessonConcepts, lessonOrder = [], knownConceptIds = null, curated = [] }) {
  const { derived, warnings: dw } = computeDerived({ unitConcepts, lessonConcepts, lessonOrder, knownConceptIds });
  const { index, warnings: cw } = applyCurated(derived, curated);

  const units = {};
  for (const [unit, hits] of Object.entries(index)) units[unit] = hits.slice(0, CAP_PER_ALGO);

  const lessons = {};
  for (const [unit, hits] of Object.entries(units)) {
    for (const h of hits) {
      (lessons[h.lesson] ?? (lessons[h.lesson] = [])).push({ unit, shared: h.shared, canonical: h.canonical });
    }
  }
  for (const [lesson, list] of Object.entries(lessons)) {
    list.sort((a, b) => Number(b.canonical) - Number(a.canonical) || b.shared - a.shared);
    lessons[lesson] = list.slice(0, CAP_PER_LESSON);
  }

  const algoUnits = Object.keys(derived).sort();
  const zeroLink = algoUnits.filter((u) => (units[u] ?? []).length === 0);
  const sortKeys = (obj) =>
    Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  return {
    index: { units: sortKeys(units), lessons: sortKeys(lessons) },
    coverage: { units: algoUnits.length, withLinks: algoUnits.length - zeroLink.length, zeroLink },
    warnings: [...dw, ...cw],
  };
}
