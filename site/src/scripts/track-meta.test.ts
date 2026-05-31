import { describe, it, expect } from "vitest";
import { TRACK_ABBR, DOMAIN_HUE, coord } from "./track-meta";
import { TRACKS } from "~/types";

describe("TRACK_ABBR", () => {
  it("has a short non-empty code for every track", () => {
    expect(Object.keys(TRACK_ABBR).length).toBe(TRACKS.length);
    for (const t of TRACKS) {
      expect(TRACK_ABBR[t]).toBeTruthy();
      expect(TRACK_ABBR[t].length).toBeLessThanOrEqual(5);
    }
  });
});

describe("DOMAIN_HUE", () => {
  it("maps every track color to a --d hue var", () => {
    for (const c of ["lilac", "mint", "peach", "sky", "rose"] as const) {
      expect(DOMAIN_HUE[c]).toMatch(/^var\(--d-/);
    }
  });
});

describe("coord", () => {
  it("formats abbr · unit · lesson, zero-padded to 2", () => {
    expect(coord("NET", 3, 2)).toBe("NET · 03 · 02");
    expect(coord("DB", 12, 7)).toBe("DB · 12 · 07");
  });
  it("falls back to abbr · lesson when unitOrder is missing", () => {
    expect(coord("ALG", undefined, 5)).toBe("ALG · 05");
  });
});
