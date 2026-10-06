import { describe, expect, it } from "vitest";
import tracks from "~/content/tracks.json";
import { ICON_PATHS } from "./paths";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe("track icons registry", () => {
  it("covers every track slug exactly once", () => {
    const slugs = (tracks as { slug: string }[]).map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) {
      expect(ICON_PATHS).toHaveProperty(`track-${slug}`);
    }
    const trackKeys = Object.keys(ICON_PATHS).filter((k) => k.startsWith("track-"));
    expect(trackKeys.length).toBe(slugs.length);
  });

  it("keeps entries well-formed: no text, inheritable paint", () => {
    for (const [key, parts] of Object.entries(ICON_PATHS)) {
      if (!key.startsWith("track-")) continue;
      expect(key.slice("track-".length)).toMatch(SLUG_RE);
      const inner = parts.join("");
      expect(inner).not.toContain("<text");
      expect(inner).not.toMatch(/stroke-width=/);
      expect(inner).not.toMatch(/stroke="(?!currentColor|none)/);
      expect(inner).not.toMatch(/fill="(?!currentColor|none)/);
    }
  });
});
