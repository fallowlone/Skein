import { describe, expect, test } from "vitest";
import { uniform, normalize, entropyOrd, expectedLevel, bandLabel, priorFromBand } from "./ordinal";

describe("ordinal posterior", () => {
  test("uniform is normalised and maximally uncertain", () => {
    const u = uniform();
    expect(u.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(entropyOrd(u)).toBeCloseTo(1); // normalised to [0,1]
  });

  test("a certain posterior has zero entropy", () => {
    expect(entropyOrd(normalize([0, 0, 1, 0]))).toBeCloseTo(0);
  });

  test("expectedLevel sits between the two levels carrying the mass", () => {
    expect(expectedLevel(normalize([0, 1, 1, 0]))).toBeCloseTo(1.5);
  });

  test("bandLabel qualifies with + when mass leans to the next level up", () => {
    const p = normalize([0, 7, 3, 0]); // junior-heavy, leaning middle
    const l = bandLabel(p);
    expect(l.level).toBe("junior");
    expect(l.qualifier).toBe("+");
  });

  test("bandLabel qualifies with - when mass leans down", () => {
    const l = bandLabel(normalize([3, 7, 0, 0]));
    expect(l.level).toBe("junior");
    expect(l.qualifier).toBe("-");
  });

  test("production starts strictly below recognition for the same band", () => {
    const rec = expectedLevel(priorFromBand("surface", "recognition"));
    const prod = expectedLevel(priorFromBand("surface", "production"));
    expect(prod).toBeLessThan(rec);
  });

  test("an advanced concept has more prior mass on gap than a foundations one", () => {
    expect(priorFromBand("advanced", "mechanism")[0]).toBeGreaterThan(
      priorFromBand("foundations", "mechanism")[0],
    );
  });
});
