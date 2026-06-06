import { describe, it, expect } from "vitest";
import { validatePathData, type PathData } from "./path";

// A minimal valid dataset (mirrors the artifact shapes).
function good(): PathData {
  return {
    concepts: [
      { id: "ip-addressing", label: { en: "IP addressing", ru: "IP-адресация" }, track: "networking", band: "foundations", requires: [] },
      { id: "tcp-handshake", label: { en: "TCP handshake", ru: "TCP-рукопожатие" }, track: "networking", band: "middle", requires: ["ip-addressing"] },
      { id: "mvcc", label: { en: "MVCC", ru: "MVCC" }, track: "databases", band: "advanced", requires: [] },
    ],
    unitConcepts: {
      "networking/01-ip": { teaches: ["ip-addressing"], requires: [], estMin: 30 },
      "networking/02-tcp": { teaches: ["tcp-handshake"], requires: ["ip-addressing"], estMin: 40 },
      "databases/03-mvcc": { teaches: ["mvcc"], requires: [], estMin: 60 },
    },
    goals: [
      { id: "senior-fullstack", label: { en: "Senior", ru: "Сеньор" }, target: { rule: "band>=middle" } },
      { id: "backend-job", label: { en: "Backend", ru: "Бэкенд" }, target: { concepts: ["tcp-handshake", "mvcc"] } },
    ],
    overrides: { addEdges: [], removeEdges: [], retag: [] },
    diagnostics: [
      { concept: "tcp-handshake", items: [
        { id: "q1", type: "mcq", prompt: { en: "?", ru: "?" }, choices: [{}, {}], answer: 1 },
        { id: "q2", type: "blanks", prompt: { en: "?", ru: "?" }, answer: ["x"] },
      ] },
    ],
  };
}

describe("validatePathData", () => {
  it("passes a structurally valid dataset", () => {
    expect(validatePathData(good())).toEqual([]);
  });

  it("flags a missing ru label (i18n parity)", () => {
    const d = good();
    d.concepts[0].label.ru = "";
    expect(validatePathData(d).some((e) => /missing en\/ru label/.test(e))).toBe(true);
  });

  it("flags a requires edge to an unknown concept", () => {
    const d = good();
    d.concepts[1].requires = ["does-not-exist"];
    expect(validatePathData(d).some((e) => /requires unknown concept "does-not-exist"/.test(e))).toBe(true);
  });

  it("flags a concept taught by no unit", () => {
    const d = good();
    d.concepts.push({ id: "orphan", label: { en: "Orphan", ru: "Сирота" }, track: "networking", band: "surface", requires: [] });
    expect(validatePathData(d).some((e) => /concept "orphan" is taught by no unit/.test(e))).toBe(true);
  });

  it("detects a cycle after overrides are applied", () => {
    const d = good();
    // ip-addressing -> tcp-handshake -> ip-addressing
    d.overrides.addEdges = [{ concept: "ip-addressing", requires: "tcp-handshake" }];
    expect(validatePathData(d).some((e) => /has a cycle/.test(e))).toBe(true);
  });

  it("flags an unresolvable goal", () => {
    const d = good();
    d.goals.push({ id: "broken", label: { en: "B", ru: "Б" }, target: { rule: "band>=nonsense" } });
    expect(validatePathData(d).some((e) => /goal "broken" resolves to no concepts/.test(e))).toBe(true);
  });

  it("flags a goal targeting an unknown concept", () => {
    const d = good();
    d.goals[1].target.concepts = ["ghost"];
    expect(validatePathData(d).some((e) => /goal "backend-job" targets unknown concept "ghost"/.test(e))).toBe(true);
  });

  it("flags an override referencing an unknown id", () => {
    const d = good();
    d.overrides.removeEdges = [{ concept: "nope", requires: "ip-addressing" }];
    expect(validatePathData(d).some((e) => /override removeEdges: unknown concept "nope"/.test(e))).toBe(true);
  });

  it("flags a diagnostic for an unknown concept and a bad item count", () => {
    const d = good();
    d.diagnostics.push({ concept: "ghost", items: [] });
    const errs = validatePathData(d);
    expect(errs.some((e) => /diagnostic for unknown concept "ghost"/.test(e))).toBe(true);
    expect(errs.some((e) => /must have 2-4 items/.test(e))).toBe(true);
  });
});

describe("cross-track-edges source validation", () => {
  const base: Omit<PathData, "crossTrackEdges"> = {
    concepts: [
      { id: "a", label: { en: "A", ru: "А" }, track: "x", band: "middle" as const, requires: [] },
      { id: "b", label: { en: "B", ru: "Б" }, track: "y", band: "surface" as const, requires: [] },
      { id: "c", label: { en: "C", ru: "В" }, track: "x", band: "surface" as const, requires: [] },
    ],
    unitConcepts: { "x/01": { teaches: ["a", "c"], requires: [], estMin: 10 }, "y/01": { teaches: ["b"], requires: [], estMin: 10 } },
    goals: [{ id: "g", label: { en: "G", ru: "Г" }, target: { concepts: ["a"] } }],
    overrides: { addEdges: [], removeEdges: [], retag: [] },
    diagnostics: [],
  };

  it("accepts a valid cross-track edge", () => {
    const errs = validatePathData({ ...base, crossTrackEdges: [{ concept: "a", requires: "b" }] });
    expect(errs.filter((e) => e.includes("cross-track-edges"))).toEqual([]);
  });
  it("flags an unknown id", () => {
    const errs = validatePathData({ ...base, crossTrackEdges: [{ concept: "a", requires: "ghost" }] });
    expect(errs.some((e) => e.includes("cross-track-edges") && e.includes("ghost"))).toBe(true);
  });
  it("flags an intra-track edge", () => {
    const errs = validatePathData({ ...base, crossTrackEdges: [{ concept: "a", requires: "c" }] });
    expect(errs.some((e) => e.includes("cross-track-edges") && e.includes("intra-track"))).toBe(true);
  });
});
