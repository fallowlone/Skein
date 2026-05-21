import { describe, it, expect } from "vitest";
import { nextTrackByOrder } from "./next-track";

const tracks = [
  { slug: "math",                 order: 1 },
  { slug: "base-cs",              order: 2 },
  { slug: "algorithms",           order: 3 },
  { slug: "networking",           order: 4 },
  { slug: "engineering-practice", order: 19 },
];

describe("nextTrackByOrder", () => {
  it("returns the track at order + 1", () => {
    expect(nextTrackByOrder(tracks, 1)?.slug).toBe("base-cs");
    expect(nextTrackByOrder(tracks, 3)?.slug).toBe("networking");
  });

  it("returns null when no track at order + 1 exists", () => {
    expect(nextTrackByOrder(tracks, 19)).toBeNull();
  });

  it("returns null for gaps in the order sequence", () => {
    expect(nextTrackByOrder(tracks, 4)).toBeNull();
  });
});
