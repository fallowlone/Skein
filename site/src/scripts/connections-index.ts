// Pure, build-time lesson connection resolver. No Astro imports — unit-tested.
//
// Reference format (matches checkMathPrereqs in src/lint/rules/lessons.ts):
//   fully-qualified: "<track>/<unit>/<slug>"   e.g. "math/01-numbers/01-what-is-a-number"
//   bare slug:       "<slug>"                  resolves within the same track+unit

const LEVELS = ["zero", "junior", "middle", "senior"] as const;
type Level = (typeof LEVELS)[number];

export type LessonDescriptor = {
  /** Fully-qualified identity: "<track>/<unit>/<slug>" */
  id: string;
  track: string;
  unit: string;
  /** Numeric order within the unit (1-based) */
  order: number;
  level: Level;
  /** Prerequisite lesson references (fully-qualified or bare slug) */
  prereqs: string[];
  /** Lessons this one explicitly deepens into (fully-qualified or bare slug) */
  deepensInto: string[];
  /** Cross-topic thread tags for spiral relations */
  spiral: string[];
};

export type ConnectionMap = {
  /** Lessons this one depends on (resolved prereqs). */
  buildsOn: string[];
  /** Lessons that depend on this one (inverse of buildsOn). */
  unlocks: string[];
  /**
   * Explicit deepensInto ids when non-empty; otherwise fallback = same-unit
   * lessons at the next-higher level rank (zero<junior<middle<senior).
   */
  deepensInto: string[];
  /** Lessons in a DIFFERENT track sharing ≥1 spiral tag with this lesson. */
  appearsAgainIn: string[];
};

/** Resolve a reference (bare slug or fully-qualified) to a lesson id.
 *  Returns null when the reference resolves to no existing lesson (dangling). */
function resolveRef(
  ref: string,
  lesson: LessonDescriptor,
  idSet: Set<string>,
): string | null {
  // Fully-qualified if it contains a slash
  if (ref.includes("/")) {
    return idSet.has(ref) ? ref : null;
  }
  // Bare slug — resolve within same track + unit
  const candidate = `${lesson.track}/${lesson.unit}/${ref}`;
  return idSet.has(candidate) ? candidate : null;
}

export function resolveConnections(
  lessons: LessonDescriptor[],
): Record<string, ConnectionMap> {
  const idSet = new Set(lessons.map((l) => l.id));

  // Index by id for quick lookup
  const byId = new Map<string, LessonDescriptor>();
  for (const l of lessons) byId.set(l.id, l);

  // Group lessons by track+unit for fallback deepensInto
  const byUnit = new Map<string, LessonDescriptor[]>();
  for (const l of lessons) {
    const key = `${l.track}/${l.unit}`;
    const arr = byUnit.get(key) ?? [];
    arr.push(l);
    byUnit.set(key, arr);
  }

  // Group lessons by track for appearsAgainIn
  const byTrack = new Map<string, LessonDescriptor[]>();
  for (const l of lessons) {
    const arr = byTrack.get(l.track) ?? [];
    arr.push(l);
    byTrack.set(l.track, arr);
  }

  // --- Pass 1: resolve buildsOn and deepensInto for each lesson ---
  const buildsOnMap = new Map<string, string[]>();
  const deepensIntoMap = new Map<string, string[]>();

  for (const lesson of lessons) {
    // buildsOn = resolved prereqs (drop dangling)
    const buildsOn: string[] = [];
    for (const ref of lesson.prereqs) {
      const resolved = resolveRef(ref, lesson, idSet);
      if (resolved !== null) buildsOn.push(resolved);
    }
    buildsOnMap.set(lesson.id, buildsOn);

    // deepensInto: explicit first
    const explicitDeepens: string[] = [];
    for (const ref of lesson.deepensInto) {
      const resolved = resolveRef(ref, lesson, idSet);
      if (resolved !== null) explicitDeepens.push(resolved);
    }

    if (explicitDeepens.length > 0) {
      deepensIntoMap.set(lesson.id, explicitDeepens);
    } else {
      // Fallback: same-unit lessons at the next-higher level
      const myLevelIdx = LEVELS.indexOf(lesson.level);
      const nextLevel: Level | undefined = LEVELS[myLevelIdx + 1];
      const fallback: string[] = [];
      if (nextLevel !== undefined) {
        const unitKey = `${lesson.track}/${lesson.unit}`;
        for (const peer of byUnit.get(unitKey) ?? []) {
          if (peer.id !== lesson.id && peer.level === nextLevel) {
            fallback.push(peer.id);
          }
        }
      }
      deepensIntoMap.set(lesson.id, fallback);
    }
  }

  // --- Pass 2: compute unlocks (inverse of buildsOn) ---
  const unlocksMap = new Map<string, string[]>();
  for (const lesson of lessons) unlocksMap.set(lesson.id, []);

  for (const lesson of lessons) {
    for (const dep of buildsOnMap.get(lesson.id) ?? []) {
      const arr = unlocksMap.get(dep);
      if (arr) arr.push(lesson.id);
    }
  }

  // --- Pass 3: compute appearsAgainIn (cross-track spiral overlap) ---
  const appearsAgainInMap = new Map<string, string[]>();

  for (const lesson of lessons) {
    if (lesson.spiral.length === 0) {
      appearsAgainInMap.set(lesson.id, []);
      continue;
    }
    const myTags = new Set(lesson.spiral);
    const matches: string[] = [];
    for (const other of lessons) {
      if (other.track === lesson.track) continue; // same track — skip
      if (other.spiral.some((tag) => myTags.has(tag))) {
        matches.push(other.id);
      }
    }
    appearsAgainInMap.set(lesson.id, matches);
  }

  // --- Assemble output ---
  const result: Record<string, ConnectionMap> = {};
  for (const lesson of lessons) {
    result[lesson.id] = {
      buildsOn: buildsOnMap.get(lesson.id) ?? [],
      unlocks: unlocksMap.get(lesson.id) ?? [],
      deepensInto: deepensIntoMap.get(lesson.id) ?? [],
      appearsAgainIn: appearsAgainInMap.get(lesson.id) ?? [],
    };
  }

  return result;
}
