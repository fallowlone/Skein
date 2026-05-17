import { describe, it, expect } from "vitest";
import { applyPatch } from "./merge-definitions.mjs";

const base = () => ({
  ack: { en: "ACK", ru: "ACK" },
  syn: { en: "SYN", ru: "SYN", seeAlso: ["ack"] },
  tcp: { en: "TCP", ru: "TCP", defEn: "old", defRu: "старое" },
});

describe("applyPatch", () => {
  it("adds defEn/defRu to an entry that lacked them", () => {
    const out = applyPatch(base(), { ack: { defEn: "an ack", defRu: "подтверждение" } });
    expect(out.ack).toEqual({ en: "ACK", ru: "ACK", defEn: "an ack", defRu: "подтверждение" });
  });

  it("preserves an existing seeAlso array", () => {
    const out = applyPatch(base(), { syn: { defEn: "a syn", defRu: "син" } });
    expect(out.syn.seeAlso).toEqual(["ack"]);
    expect(out.syn.defEn).toBe("a syn");
  });

  it("preserves overall key order and other entries", () => {
    const out = applyPatch(base(), { syn: { defEn: "x", defRu: "ы" } });
    expect(Object.keys(out)).toEqual(["ack", "syn", "tcp"]);
  });

  it("overwrites an existing definition", () => {
    const out = applyPatch(base(), { tcp: { defEn: "new", defRu: "новое" } });
    expect(out.tcp.defEn).toBe("new");
  });

  it("throws when a patch key is absent from the glossary", () => {
    expect(() => applyPatch(base(), { ghost: { defEn: "g", defRu: "г" } })).toThrow(/ghost/);
  });

  it("throws on an empty or missing defEn/defRu", () => {
    expect(() => applyPatch(base(), { ack: { defEn: "", defRu: "x" } })).toThrow(/defEn/i);
    expect(() => applyPatch(base(), { ack: { defEn: "x" } })).toThrow(/defRu/i);
  });
});
