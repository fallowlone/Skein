import { describe, it, expect } from "vitest";
import { text, oneOf, int, invalid } from "./validate";

describe("text", () => {
  it("trims and accepts in-bounds input", () => {
    expect(text("  tcp  ", { min: 2, max: 128, code: "q_too_short" })).toEqual({ ok: true, value: "tcp" });
  });
  it("rejects too-short input with its code", () => {
    expect(text("a", { min: 2, max: 128, code: "q_too_short" })).toEqual({ ok: false, code: "q_too_short" });
  });
  it("rejects too-long input with its code", () => {
    expect(text("x".repeat(129), { min: 2, max: 128, code: "q_too_long" })).toEqual({ ok: false, code: "q_too_long" });
  });
  it("rejects non-strings and null with the short code", () => {
    expect(text(null, { min: 2, max: 128, code: "q_too_short" })).toEqual({ ok: false, code: "q_too_short" });
    expect(text(42, { min: 2, max: 128, code: "q_too_short" })).toEqual({ ok: false, code: "q_too_short" });
  });
});

describe("oneOf", () => {
  it("accepts a listed member", () => {
    expect(oneOf("en", ["en", "ru"] as const, "bad_lang")).toEqual({ ok: true, value: "en" });
  });
  it("rejects unknown or missing members with its code", () => {
    expect(oneOf("de", ["en", "ru"] as const, "bad_lang")).toEqual({ ok: false, code: "bad_lang" });
    expect(oneOf(null, ["en", "ru"] as const, "bad_lang")).toEqual({ ok: false, code: "bad_lang" });
  });
});

describe("int", () => {
  it("accepts in-range integers", () => {
    expect(int("3", { min: 1, max: 100, code: "bad_page" })).toEqual({ ok: true, value: 3 });
  });
  it("defaults null to the fallback", () => {
    expect(int(null, { min: 1, max: 100, code: "bad_page", fallback: 1 })).toEqual({ ok: true, value: 1 });
  });
  it("rejects floats, junk, and out-of-range values", () => {
    for (const raw of ["1.5", "abc", "0", "101"]) {
      expect(int(raw, { min: 1, max: 100, code: "bad_page" })).toEqual({ ok: false, code: "bad_page" });
    }
  });
});

describe("invalid", () => {
  it("maps a validation failure to 422 with a stable code body", async () => {
    const res = invalid("q_too_short");
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "q_too_short" });
  });
});
