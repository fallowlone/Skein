import { describe, it, expect } from "vitest";
import { exportModel, importModel, type StorageLike } from "./model-backup";

function fakeStore(init: Record<string, string> = {}): StorageLike {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
  };
}

describe("model backup", () => {
  it("exports only app-prefixed keys as a versioned JSON blob", () => {
    const s = fakeStore({ "skein.user-state.v1": "{\"x\":1}", "atlas.review.v1": "[]", "thirdparty.foo": "nope" });
    const json = exportModel(s);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.data["skein.user-state.v1"]).toBe("{\"x\":1}");
    expect(parsed.data["atlas.review.v1"]).toBe("[]");
    expect(parsed.data["thirdparty.foo"]).toBeUndefined();
  });
  it("imports app-prefixed keys and reports the restored count", () => {
    const s = fakeStore();
    const blob = JSON.stringify({ version: 1, data: { "skein.user-state.v1": "{\"x\":2}", "atlas.review.v1": "[]", "evil.key": "x" } });
    const r = importModel(s, blob);
    expect(r.restored).toBe(2);
    expect(s.getItem("skein.user-state.v1")).toBe("{\"x\":2}");
    expect(s.getItem("evil.key")).toBeNull(); // non-app key refused
  });
  it("throws on malformed JSON", () => {
    expect(() => importModel(fakeStore(), "not json")).toThrow();
  });
  it("throws when the blob shape is wrong", () => {
    expect(() => importModel(fakeStore(), JSON.stringify({ nope: true }))).toThrow();
  });
});
