import { describe, it, expect } from "vitest";
import { exportModel, importModel, type StorageLike } from "./model-backup";

function fakeStore(init: Record<string, string> = {}, failAt = Infinity): StorageLike {
  const m = new Map(Object.entries(init));
  let writes = 0;
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => {
      writes++;
      if (writes === failAt) throw new DOMException("quota", "QuotaExceededError");
      m.set(k, v);
    },
    removeItem: (k: string) => { m.delete(k); },
  };
}

describe("model backup", () => {
  it("exports a complete local learning snapshot without credentials or cache identifiers", () => {
    const learning = {
      "skein.user-state.v1": JSON.stringify({ tier: "middle", futureEvidence: { opaque: true } }),
      "skein.path-knowledge.v1": JSON.stringify([["tcp", { confidence: 0.8, source: "activity", lastAt: 5, future: "kept" }]]),
      "skein.path-config.v1": JSON.stringify({ goals: [], weights: {}, pace: {} }),
      "skein.path-overrides.v1": JSON.stringify({ addEdges: [], removeEdges: [] }),
      "atlas.practice.go/01/lesson": JSON.stringify({ task: "done" }),
      "atlas.practice-attempts.go/01/lesson": JSON.stringify({ task: { attempts: 2, passes: 1, lastResult: "fail", lastAt: 8 } }),
      "atlas.practice-responses.go/01/lesson": JSON.stringify({ task: "unicode 👩🏽‍💻 ' ; --" }),
      "atlas.practice-selfgrade.go/01/lesson": JSON.stringify({ task: { grade: "partial", lastAt: 8 } }),
      "atlas.review.v1": JSON.stringify({ card: { lessonKey: "go/01/lesson", dueAt: 9, futureEvidence: [1] } }),
      "atlas.assess.v1": JSON.stringify({ scope: [], phase: "survey", cells: [], asked: [], blockIndex: 0, blockItems: 0, blockMinutes: 0, startedAtMs: 1, updatedAtMs: 1 }),
      "skein.english.v2": JSON.stringify({ words: {}, revealed: {}, settings: {}, readUnits: {}, outputAttempts: {}, grammarDone: {}, collocationDone: {}, hoursLog: [], chunks: {}, grammar: {}, futureEvidence: { retained: true } }),
      "skein.english.register.v1": "everyday",
      "skein.algo-workspace.3sum.history.v1": "[]",
      "skein.capstone.api": JSON.stringify({ milestone: true }),
      "skein.drill.v1": JSON.stringify({ drill: { status: "solved", at: 4 } }),
      "atlas.last.en.go": JSON.stringify({ slug: "lesson", title: "Lesson", href: "/en/learn/go/01/lesson/", at: 5 }),
    };
    const s = fakeStore({
      ...learning,
      "skein.admin.token": "secret",
      "skein.english.byok": "secret",
      "skein.metrics.id": "tracking-id",
      "skein.whisper.ready": "1",
      "thirdparty.foo": "nope",
    });
    const json = exportModel(s, 123);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual({ version: 2, exportedAt: 123, data: learning });
  });

  it("round-trips every exported value losslessly", () => {
    const source = fakeStore({
      "skein.user-state.v1": JSON.stringify({ tier: "senior", evidence: { nested: ["new"] } }),
      "atlas.practice-responses.a/b/c": JSON.stringify({ q1: "ответ 👩‍💻" }),
      "skein.english.v2": JSON.stringify({ words: {}, hoursLog: [], extension: { x: 1 } }),
    });
    const target = fakeStore();
    const json = exportModel(source, 10);

    expect(importModel(target, json)).toEqual({ restored: 3 });
    for (let i = 0; i < source.length; i++) {
      const key = source.key(i)!;
      expect(target.getItem(key)).toBe(source.getItem(key));
    }
  });

  it("still imports valid version-1 generic Settings backups", () => {
    const s = fakeStore();
    const blob = JSON.stringify({ version: 1, data: { "skein.user-state.v1": JSON.stringify({ tier: "middle" }), "atlas.review.v1": "{}" } });
    const r = importModel(s, blob);
    expect(r.restored).toBe(2);
    expect(s.getItem("skein.user-state.v1")).toBe(JSON.stringify({ tier: "middle" }));
  });

  it.each([
    { version: 2, data: { "skein.admin.token": "secret" } },
    { version: 2, data: { "skein.english.byok": "secret" } },
    { version: 2, data: { "evil.key": "x" } },
    { version: 2, data: { "__proto__.polluted": "x" } },
  ])("rejects a poisoned key before writing anything", (blob) => {
    const s = fakeStore({ "skein.user-state.v1": JSON.stringify({ tier: "junior" }) });
    expect(() => importModel(s, JSON.stringify(blob))).toThrow(/key/i);
    expect(s.getItem("skein.user-state.v1")).toBe(JSON.stringify({ tier: "junior" }));
  });

  it("rejects malformed nested learning payloads before any write", () => {
    const before = JSON.stringify({ tier: "junior" });
    const s = fakeStore({ "skein.user-state.v1": before });
    const blob = JSON.stringify({
      version: 2,
      data: {
        "skein.user-state.v1": JSON.stringify({ tier: "senior" }),
        "atlas.practice-attempts.a/b/c": JSON.stringify({ task: { attempts: -1, passes: 0, lastResult: "fail", lastAt: 0 } }),
      },
    });
    expect(() => importModel(s, blob)).toThrow(/practice-attempts/i);
    expect(s.getItem("skein.user-state.v1")).toBe(before);
  });

  it("rolls every earlier write back when localStorage quota fails", () => {
    const oldUser = JSON.stringify({ tier: "junior" });
    const s = fakeStore({ "skein.user-state.v1": oldUser }, 2);
    const blob = JSON.stringify({
      version: 2,
      data: {
        "skein.user-state.v1": JSON.stringify({ tier: "senior" }),
        "skein.english.register.v1": "everyday",
      },
    });
    expect(() => importModel(s, blob)).toThrow(/quota|restore/i);
    expect(s.getItem("skein.user-state.v1")).toBe(oldUser);
    expect(s.getItem("skein.english.register.v1")).toBeNull();
  });

  it("throws on malformed JSON", () => {
    expect(() => importModel(fakeStore(), "not json")).toThrow();
  });

  it.each([
    { nope: true },
    { version: 3, data: {} },
    { version: 2, data: [] },
    { version: 2, data: { "skein.user-state.v1": null } },
    { version: 2, exportedAt: -1, data: {} },
  ])("throws when the blob shape is malformed", (blob) => {
    expect(() => importModel(fakeStore(), JSON.stringify(blob))).toThrow();
  });
});
