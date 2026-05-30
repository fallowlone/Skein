import { describe, it, expect } from "vitest";
import { bandForRank, BAND_SIZE, idFor } from "./bands";

describe("bandForRank", () => {
  it("maps NGSL ranks to bands by cutoff", () => {
    expect(bandForRank(1, "ngsl")).toBe("A2");
    expect(bandForRank(800, "ngsl")).toBe("A2");
    expect(bandForRank(801, "ngsl")).toBe("B1");
    expect(bandForRank(2000, "ngsl")).toBe("B1");
    expect(bandForRank(2001, "ngsl")).toBe("B2");
    expect(bandForRank(2800, "ngsl")).toBe("B2");
  });
  it("maps all NAWL words to B2 regardless of rank", () => {
    expect(bandForRank(1, "nawl")).toBe("B2");
    expect(bandForRank(900, "nawl")).toBe("B2");
  });
  it("builds a stable zero-padded id from source + rank", () => {
    expect(idFor("ngsl", 42)).toBe("ngsl:0042");
    expect(idFor("nawl", 107)).toBe("nawl:0107");
  });
  it("exposes approximate band sizes used for estimation", () => {
    expect(BAND_SIZE.A2).toBeGreaterThan(0);
    expect(BAND_SIZE.B1).toBeGreaterThan(0);
    expect(BAND_SIZE.B2).toBeGreaterThan(0);
  });
});
