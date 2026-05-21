import { describe, it, expect } from "vitest";
import { TRACK_BAND, BANDS, bandOf } from "./track-band";
import { TRACKS } from "~/types";

describe("track-band", () => {
  it("assigns every known track to exactly one band", () => {
    for (const slug of TRACKS) {
      const band = TRACK_BAND[slug];
      expect(band, `${slug} has no band`).toBeDefined();
      expect(BANDS).toContain(band);
    }
  });

  it("BANDS enumerates exactly the four altitude bands top→bottom", () => {
    expect(BANDS).toEqual(["advanced", "middle", "surface", "foundations"]);
  });

  it("groups foundations tracks under foundations", () => {
    expect(TRACK_BAND["math"]).toBe("foundations");
    expect(TRACK_BAND["base-cs"]).toBe("foundations");
    expect(TRACK_BAND["algorithms"]).toBe("foundations");
  });

  it("groups the day-to-day fullstack tracks under surface", () => {
    expect(TRACK_BAND["networking"]).toBe("surface");
    expect(TRACK_BAND["databases"]).toBe("surface");
    expect(TRACK_BAND["frontend"]).toBe("surface");
    expect(TRACK_BAND["backend"]).toBe("surface");
  });

  it("groups distributed / observability / security under middle", () => {
    expect(TRACK_BAND["distributed"]).toBe("middle");
    expect(TRACK_BAND["observability"]).toBe("middle");
    expect(TRACK_BAND["security"]).toBe("middle");
  });

  it("groups ai-llm / data-engineering / deployment / performance / engineering-practice under advanced", () => {
    expect(TRACK_BAND["ai-llm"]).toBe("advanced");
    expect(TRACK_BAND["data-engineering"]).toBe("advanced");
    expect(TRACK_BAND["deployment"]).toBe("advanced");
    expect(TRACK_BAND["performance"]).toBe("advanced");
    expect(TRACK_BAND["engineering-practice"]).toBe("advanced");
  });

  it("bandOf returns the band for a known slug", () => {
    expect(bandOf("networking")).toBe("surface");
  });
});
