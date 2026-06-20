// src/components/icons/paths.ts
// Hand-authored editorial-cartographic icon registry. One source of truth for
// both .astro and .tsx callsites. Each key maps to an array of trusted SVG
// child markup strings; Icon.tsx / Icon.astro wrap them in the standard 24×24
// shell (fill=none, stroke=currentColor, 1.6 round cap+join). Path strings are
// first-party, trusted content (no user input) — safe to inject as inner HTML.
//
// Proof subset (15). The remaining ~50 — full achievement set, the 9-tier rank
// family, and the migrated nav/control glyphs — land in the same registry after
// sign-off. `flame` reuses the live StreakBadge exemplar.
export const ICON_PATHS = {
  /* Activity / streak / progression */
  "flame": [
    "<path d=\"M12 3c.5 2.3 1.9 3.5 3.1 4.8C16.6 9.3 18 10.9 18 13.4a6 6 0 0 1-12 0c0-1.3.5-2.4 1.3-3.3.3 1 .9 1.6 1.7 1.9-.2-2 .6-4.2 3-6Z\"/>",
  ],
  "xp": [
    "<path d=\"M9 4h6l3 5-6 12-6-12 3-5Z\"/>",
    "<path d=\"M6 9h12M9 4l3 5 3-5M9 9l3 12 3-12\"/>",
  ],
  "level-up": [
    "<path d=\"M6 13l6-5 6 5\"/>",
    "<path d=\"M6 18l6-5 6 5\"/>",
  ],
  "mission": [
    "<path d=\"M8 21V4\"/>",
    "<path d=\"M8 4.5h9l-2.5 3 2.5 3H8\"/>",
    "<path d=\"M5 21h6\"/>",
  ],
  "check": [
    "<path d=\"M5 12.5l5 5 9-10\"/>",
  ],
  "x": [
    "<path d=\"M7 7l10 10M17 7L7 17\"/>",
  ],
  "pen": [
    "<path d=\"M9 3.5h6l2 8-5 9-5-9 2-8Z\"/>",
    "<path d=\"M12 12.5V20.5\"/>",
    "<circle cx=\"12\" cy=\"11\" r=\"1.2\"/>",
  ],

  /* Achievements */
  "first-steps": [
    "<path d=\"M12 21V11\"/>",
    "<path d=\"M12 13C8.5 13 7 10.5 7 8c3.5 0 5 2.5 5 5Z\"/>",
    "<path d=\"M12 11C15.5 11 17 8.5 17 6c-3.5 0-5 2.5-5 5Z\"/>",
  ],
  "perfectionist": [
    "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"4.5\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "drill-rookie": [
    "<circle cx=\"12\" cy=\"12\" r=\"7.5\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"3\"/>",
    "<path d=\"M12 2v3M12 19v3M2 12h3M19 12h3\"/>",
  ],
  "retriever": [
    "<path d=\"M5.5 12a6.5 6.5 0 1 1 2.4 5\"/>",
    "<path d=\"M7.9 17.4l-2.5-.3.3-2.5\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "night-owl": [
    "<path d=\"M15.5 15.5A7 7 0 1 1 9 5a5.6 5.6 0 0 0 6.5 10.5Z\"/>",
    "<path d=\"M18.5 4.5l.55 1.7 1.7.55-1.7.55-.55 1.7-.55-1.7-1.7-.55 1.7-.55Z\"/>",
  ],

  /* Player ranks (icon stroked; per-tier colour applied by parent) */
  "practitioner": [
    "<path d=\"M19.4 13a7.5 7.5 0 0 0 0-2l1.9-1.5-1.6-2.8-2.2.9a7.4 7.4 0 0 0-1.7-1l-.3-2.4h-3.2l-.3 2.4a7.4 7.4 0 0 0-1.7 1l-2.2-.9L4.7 9.5 6.6 11a7.5 7.5 0 0 0 0 2l-1.9 1.5 1.6 2.8 2.2-.9a7.4 7.4 0 0 0 1.7 1l.3 2.4h3.2l.3-2.4a7.4 7.4 0 0 0 1.7-1l2.2.9 1.6-2.8L19.4 13Z\"/>",
    "<path d=\"M12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2Z\"/>",
  ],
  "staff": [
    "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/>",
    "<path d=\"M12 5l1.6 7-1.6 7-1.6-7Z\"/>",
    "<path d=\"M5 12l7-1.6 7 1.6-7 1.6Z\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "distinguished": [
    "<path d=\"M5 18l1.5-9 3.6 5L12 6.5l1.9 7.5 3.6-5L19 18Z\"/>",
    "<path d=\"M7.5 21h9\"/>",
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;
