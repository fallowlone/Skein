// Tests for resolveConnections — run with: bunx vitest run src/scripts/connections-index.test.ts
import { describe, it, expect } from "vitest";
import { resolveConnections, type LessonDescriptor } from "./connections-index";

// ---------------------------------------------------------------------------
// Minimal fixture
// ---------------------------------------------------------------------------

const lessons: LessonDescriptor[] = [
  // math track, unit 01
  {
    id: "math/01-numbers/01-what-is-a-number",
    track: "math",
    unit: "01-numbers",
    order: 1,
    level: "zero",
    prereqs: [],
    deepensInto: [],
    spiral: ["numbers", "abstraction"],
  },
  {
    id: "math/01-numbers/02-integers",
    track: "math",
    unit: "01-numbers",
    order: 2,
    level: "junior",
    prereqs: ["math/01-numbers/01-what-is-a-number"],
    deepensInto: [],
    spiral: ["numbers"],
  },
  {
    id: "math/01-numbers/03-rationals",
    track: "math",
    unit: "01-numbers",
    order: 3,
    level: "middle",
    prereqs: ["math/01-numbers/02-integers"],
    deepensInto: [],
    spiral: ["numbers"],
  },
  {
    id: "math/01-numbers/04-advanced",
    track: "math",
    unit: "01-numbers",
    order: 4,
    level: "senior",
    prereqs: [],
    deepensInto: [],
    spiral: [],
  },
  // algorithms track — shares "numbers" spiral tag
  {
    id: "algorithms/01-intro/01-what-is-an-algorithm",
    track: "algorithms",
    unit: "01-intro",
    order: 1,
    level: "zero",
    prereqs: [],
    deepensInto: [],
    spiral: ["abstraction"],
  },
  {
    id: "algorithms/01-intro/02-complexity",
    track: "algorithms",
    unit: "01-intro",
    order: 2,
    level: "junior",
    prereqs: ["algorithms/01-intro/01-what-is-an-algorithm"],
    deepensInto: [],
    spiral: ["numbers", "complexity"],
  },
  // algorithms track unit 02
  {
    id: "algorithms/02-sorting/01-bubble",
    track: "algorithms",
    unit: "02-sorting",
    order: 1,
    level: "junior",
    prereqs: ["algorithms/01-intro/02-complexity"],
    deepensInto: ["algorithms/02-sorting/02-merge"],
    spiral: ["sorting"],
  },
  {
    id: "algorithms/02-sorting/02-merge",
    track: "algorithms",
    unit: "02-sorting",
    order: 2,
    level: "middle",
    prereqs: ["algorithms/02-sorting/01-bubble"],
    deepensInto: [],
    spiral: ["sorting"],
  },
];

describe("resolveConnections — buildsOn (prereqs)", () => {
  const result = resolveConnections(lessons);

  it("buildsOn is the resolved prereqs for that lesson", () => {
    expect(result["math/01-numbers/02-integers"].buildsOn).toEqual([
      "math/01-numbers/01-what-is-a-number",
    ]);
  });

  it("buildsOn is empty when prereqs is empty", () => {
    expect(result["math/01-numbers/01-what-is-a-number"].buildsOn).toEqual([]);
  });

  it("buildsOn contains multiple prereqs in input order", () => {
    // algorithms/02-sorting/01-bubble depends on algorithms/01-intro/02-complexity
    expect(result["algorithms/02-sorting/01-bubble"].buildsOn).toEqual([
      "algorithms/01-intro/02-complexity",
    ]);
  });
});

describe("resolveConnections — unlocks (inverse prereqs)", () => {
  const result = resolveConnections(lessons);

  it("unlocks contains every lesson that lists this lesson as a prereq", () => {
    expect(result["algorithms/01-intro/01-what-is-an-algorithm"].unlocks).toEqual([
      "algorithms/01-intro/02-complexity",
    ]);
  });

  it("unlocks is empty when no lesson lists this lesson as a prereq", () => {
    // math/01-numbers/03-rationals is not a prereq of anyone
    expect(result["math/01-numbers/03-rationals"].unlocks).toEqual([]);
  });

  it("unlocks contains multiple entries when multiple lessons share this prereq", () => {
    // math/01-numbers/01-what-is-a-number is a prereq of 02-integers only
    expect(result["math/01-numbers/01-what-is-a-number"].unlocks).toContain(
      "math/01-numbers/02-integers"
    );
  });
});

describe("resolveConnections — deepensInto (explicit)", () => {
  const result = resolveConnections(lessons);

  it("deepensInto is the explicitly listed ids when non-empty", () => {
    expect(result["algorithms/02-sorting/01-bubble"].deepensInto).toEqual([
      "algorithms/02-sorting/02-merge",
    ]);
  });
});

describe("resolveConnections — deepensInto (fallback: same-unit next-higher level)", () => {
  const result = resolveConnections(lessons);

  it("when deepensInto is empty, falls back to same-unit lessons at the next higher level", () => {
    // math/01-numbers/01-what-is-a-number is zero; next higher = junior
    // math/01-numbers/02-integers is junior in the same unit
    expect(result["math/01-numbers/01-what-is-a-number"].deepensInto).toContain(
      "math/01-numbers/02-integers"
    );
  });

  it("fallback does not include lessons at the same level", () => {
    const val = result["math/01-numbers/01-what-is-a-number"].deepensInto;
    expect(val).not.toContain("math/01-numbers/01-what-is-a-number");
  });

  it("fallback does not include lessons from a different unit", () => {
    const val = result["math/01-numbers/01-what-is-a-number"].deepensInto;
    for (const id of val) {
      expect(id.startsWith("math/01-numbers/")).toBe(true);
    }
  });

  it("fallback is empty for the top level (senior) when no explicit deepensInto", () => {
    // math/01-numbers/04-advanced is senior — no higher level exists
    expect(result["math/01-numbers/04-advanced"].deepensInto).toEqual([]);
  });

  it("fallback uses next-higher level (zero→junior, junior→middle, middle→senior)", () => {
    // 02-integers is junior → fallback should include 03-rationals (middle), not 04-advanced (senior)
    const val = result["math/01-numbers/02-integers"].deepensInto;
    expect(val).toContain("math/01-numbers/03-rationals");
    expect(val).not.toContain("math/01-numbers/04-advanced");
  });
});

describe("resolveConnections — appearsAgainIn (cross-track spiral tags)", () => {
  const result = resolveConnections(lessons);

  it("appearsAgainIn lists lessons in a DIFFERENT track sharing ≥1 spiral tag", () => {
    // math/01-numbers/01-what-is-a-number has spiral ["numbers","abstraction"]
    // algorithms/01-intro/01-what-is-an-algorithm has ["abstraction"] — different track, matches
    // algorithms/01-intro/02-complexity has ["numbers","complexity"] — different track, matches
    const val = result["math/01-numbers/01-what-is-a-number"].appearsAgainIn;
    expect(val).toContain("algorithms/01-intro/01-what-is-an-algorithm");
    expect(val).toContain("algorithms/01-intro/02-complexity");
  });

  it("appearsAgainIn does NOT include lessons from the same track", () => {
    // math/01-numbers/02-integers has ["numbers"]; math/03-rationals also has ["numbers"] — same track
    const val = result["math/01-numbers/02-integers"].appearsAgainIn;
    expect(val).not.toContain("math/01-numbers/03-rationals");
    expect(val).not.toContain("math/01-numbers/01-what-is-a-number");
  });

  it("appearsAgainIn is empty when no cross-track spiral overlap", () => {
    // algorithms/02-sorting/01-bubble has ["sorting"]; no math lesson has "sorting"
    const val = result["algorithms/02-sorting/01-bubble"].appearsAgainIn;
    expect(val).toEqual([]);
  });

  it("appearsAgainIn is empty when spiral is empty", () => {
    // math/01-numbers/04-advanced has spiral []
    expect(result["math/01-numbers/04-advanced"].appearsAgainIn).toEqual([]);
  });
});

describe("resolveConnections — bare slug references resolve within same track+unit", () => {
  it("a prereq given as a bare slug resolves to same track+unit", () => {
    const local: LessonDescriptor[] = [
      {
        id: "math/02-fractions/01-intro",
        track: "math",
        unit: "02-fractions",
        order: 1,
        level: "zero",
        prereqs: [],
        deepensInto: [],
        spiral: [],
      },
      {
        id: "math/02-fractions/02-adding",
        track: "math",
        unit: "02-fractions",
        order: 2,
        level: "junior",
        // bare slug — should resolve to math/02-fractions/01-intro
        prereqs: ["01-intro"],
        deepensInto: [],
        spiral: [],
      },
    ];
    const r = resolveConnections(local);
    expect(r["math/02-fractions/02-adding"].buildsOn).toEqual(["math/02-fractions/01-intro"]);
    expect(r["math/02-fractions/01-intro"].unlocks).toEqual(["math/02-fractions/02-adding"]);
  });

  it("a deepensInto given as bare slug resolves within same track+unit", () => {
    const local: LessonDescriptor[] = [
      {
        id: "algorithms/03-trees/01-basics",
        track: "algorithms",
        unit: "03-trees",
        order: 1,
        level: "zero",
        prereqs: [],
        deepensInto: ["02-bst"],
        spiral: [],
      },
      {
        id: "algorithms/03-trees/02-bst",
        track: "algorithms",
        unit: "03-trees",
        order: 2,
        level: "junior",
        prereqs: [],
        deepensInto: [],
        spiral: [],
      },
    ];
    const r = resolveConnections(local);
    expect(r["algorithms/03-trees/01-basics"].deepensInto).toEqual(["algorithms/03-trees/02-bst"]);
  });
});

describe("resolveConnections — dangling references dropped silently", () => {
  it("a prereq pointing to a non-existent lesson is dropped", () => {
    const local: LessonDescriptor[] = [
      {
        id: "math/01-numbers/01-intro",
        track: "math",
        unit: "01-numbers",
        order: 1,
        level: "zero",
        prereqs: ["math/99-ghost/01-does-not-exist"],
        deepensInto: [],
        spiral: [],
      },
    ];
    const r = resolveConnections(local);
    expect(r["math/01-numbers/01-intro"].buildsOn).toEqual([]);
  });

  it("a deepensInto pointing to a non-existent lesson is dropped", () => {
    const local: LessonDescriptor[] = [
      {
        id: "algorithms/01-intro/01-start",
        track: "algorithms",
        unit: "01-intro",
        order: 1,
        level: "zero",
        prereqs: [],
        deepensInto: ["ghost-lesson"],
        spiral: [],
      },
    ];
    const r = resolveConnections(local);
    expect(r["algorithms/01-intro/01-start"].deepensInto).toEqual([]);
  });
});

describe("resolveConnections — every input lesson has an entry in the output map", () => {
  it("output map has an entry for every input lesson id", () => {
    const result = resolveConnections(lessons);
    for (const lesson of lessons) {
      expect(result).toHaveProperty(lesson.id);
    }
  });
});
