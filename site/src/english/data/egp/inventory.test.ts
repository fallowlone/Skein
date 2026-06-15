import { describe, it, expect } from "vitest";
import { EGP_INVENTORY, egpById } from "./index";
import { isEgpCategory } from "./types";
import { CEFR_ORDER } from "~/english/grammar-types";

describe("EGP inventory", () => {
  it("is non-empty with unique ids", () => {
    expect(EGP_INVENTORY.length).toBeGreaterThan(0);
    const ids = EGP_INVENTORY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every entry has a valid cefr (A1..C2) and known category", () => {
    const bands = new Set<string>(CEFR_ORDER);
    const bad = EGP_INVENTORY.filter(
      (e) => !bands.has(e.cefr) || e.cefr === "A0" || !isEgpCategory(e.category),
    );
    expect(bad.map((e) => e.id)).toEqual([]);
  });
  it("ids follow the egp.<cefr>.<category>.<slug> namespace", () => {
    const bad = EGP_INVENTORY.filter((e) => !/^egp\.[a-c][12]\.[a-z-]+\.[a-z0-9-]+$/.test(e.id));
    expect(bad.map((e) => e.id)).toEqual([]);
  });
  it("byId map resolves entries", () => {
    const first = EGP_INVENTORY[0];
    expect(egpById.get(first.id)?.id).toBe(first.id);
  });
});
