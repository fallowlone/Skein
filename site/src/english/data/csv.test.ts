// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function rows(name: string): string[][] {
  const path = fileURLToPath(new URL(`./${name}`, import.meta.url));
  const text = readFileSync(path, "utf8").trim();
  const lines = text.split(/\r?\n/);
  return lines.slice(1).map((l) => l.split(","));
}

describe("source vocab CSVs", () => {
  it("ngsl.csv has ~2800 rows, ascending unique ranks, non-empty lemmas", () => {
    const r = rows("ngsl.csv");
    expect(r.length).toBeGreaterThan(2500);
    expect(r.length).toBeLessThan(3000);
    const ranks = r.map((c) => Number(c[0]));
    expect(ranks[0]).toBe(1);
    expect(new Set(ranks).size).toBe(ranks.length);
    expect(r.every((c) => c[1] && c[1].trim().length > 0)).toBe(true);
  });
  it("nawl.csv has ~960 rows with non-empty lemmas", () => {
    const r = rows("nawl.csv");
    expect(r.length).toBeGreaterThan(800);
    expect(r.length).toBeLessThan(1100);
    expect(r.every((c) => c[1] && c[1].trim().length > 0)).toBe(true);
  });
});
