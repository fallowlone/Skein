import { describe, it, expect } from "vitest";
import { bandForRank, BAND_SIZE, idFor } from "./bands";

describe("bandForRank", () => {
  it("maps German ranks to bands by cutoff", () => {
    expect(bandForRank(1)).toBe("A1");
    expect(bandForRank(600)).toBe("A1");
    expect(bandForRank(601)).toBe("A2");
    expect(bandForRank(1600)).toBe("A2");
    expect(bandForRank(1601)).toBe("B1");
    expect(bandForRank(3000)).toBe("B1");
  });
  it("builds a stable zero-padded id from rank", () => {
    expect(idFor(42)).toBe("de:0042");
    expect(idFor(107)).toBe("de:0107");
    expect(idFor(1)).toBe("de:0001");
  });
  it("exposes approximate band sizes used for estimation", () => {
    expect(BAND_SIZE.A1).toBeGreaterThan(0);
    expect(BAND_SIZE.A2).toBeGreaterThan(0);
    expect(BAND_SIZE.B1).toBeGreaterThan(0);
  });
});
