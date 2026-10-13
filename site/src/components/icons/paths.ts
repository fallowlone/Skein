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

  /* Learning tracks (24-grid line-art, stroke inherited from Icon shell) */
  "track-ai-llm": [
    "<g transform=\"translate(0,1)\"><path d=\"M12 3l1.7 5.1L19 9.8l-5.3 1.7L12 16.6l-1.7-5.1L5 9.8l5.3-1.7z\"/><circle cx=\"18.3\" cy=\"18\" r=\"1.7\" fill=\"currentColor\" stroke=\"none\"/></g>",
  ],
  "track-algorithms": [
    "<path d=\"M12 3.5 19 10l-7 6.5L5 10z\"/>",
    "<path d=\"M12 16.5V21\"/>",
    "<path d=\"M5 10H3M21 10h-2\"/>",
    "<circle cx=\"12\" cy=\"10\" r=\"1.8\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-apis": [
    "<path d=\"M9 8l-4 4 4 4\"/>",
    "<path d=\"M15 8l4 4-4 4\"/>",
    "<path d=\"M13.5 5l-3 14\"/>",
  ],
  "track-architecture-patterns": [
    "<path d=\"M5.5 20v-7.5a6.5 6.5 0 0 1 13 0V20\"/>",
    "<path d=\"M8.5 20v-6a3.5 3.5 0 0 1 7 0v6\"/>",
    "<path d=\"M3.5 20h17\"/>",
    "<circle cx=\"12\" cy=\"6\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-aws": [
    "<path d=\"M7 15.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17.2 9.3 3.2 3.2 0 0 1 17 15.5H7Z\"/>",
    "<path d=\"M5 18.6c2.4 1.5 4.6 2.3 7 2.3s4.6-.8 7-2.3\"/>",
    "<path d=\"M17.4 16.7v2.9l2.4-1.5\"/>",
  ],
  "track-backend": [
    "<rect x=\"4\" y=\"4\" width=\"16\" height=\"7\" rx=\"1.5\"/>",
    "<rect x=\"4\" y=\"13\" width=\"16\" height=\"7\" rx=\"1.5\"/>",
    "<path d=\"M7.5 7.5h4\"/>",
    "<path d=\"M7.5 16.5h4\"/>",
    "<circle cx=\"17\" cy=\"7.5\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-base-cs": [
    "<rect x=\"7\" y=\"7\" width=\"10\" height=\"10\" rx=\"2\"/>",
    "<path d=\"M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-browser": [
    "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"14\" rx=\"2\"/>",
    "<path d=\"M3.5 9.5h17\"/>",
    "<circle cx=\"6.6\" cy=\"7.2\" r=\"1.3\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-caching": [
    "<g transform=\"translate(0,0.75)\"><path d=\"M19 12a7 7 0 1 1-2-4.9\"/><path d=\"M19 3.5V8h-4.5\"/><path d=\"M13.2 9.5 10.5 14H13l-1 4.5 4.5-6H14z\"/></g>",
  ],
  "track-ci-cd": [
    "<path d=\"M2.5 12h1M7.5 12h3M13.5 12h3M20.5 12h1\"/>",
    "<circle cx=\"5.5\" cy=\"12\" r=\"2\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.5\" fill=\"currentColor\" stroke=\"none\"/>",
    "<circle cx=\"18.5\" cy=\"12\" r=\"2\"/>",
    "<path d=\"M20.9 10.3l1.8 1.7-1.8 1.7\"/>",
  ],
  "track-cli": [
    "<rect x=\"3\" y=\"4.5\" width=\"18\" height=\"15\" rx=\"2\"/>",
    "<path d=\"M7 10l3 3-3 3\"/>",
    "<path d=\"M12.5 16.5H17\"/>",
  ],
  "track-code-patterns": [
    "<g transform=\"translate(0,-2)\"><path d=\"M14 5c-2.5 0-3 1.2-3 3v3c0 1.5-1 2.5-2.5 3 1.5.5 2.5 1.5 2.5 3v3c0 1.8.5 3 3 3\"/><path d=\"M10 5c2.5 0 3 1.2 3 3v3c0 1.5 1 2.5 2.5 3-1.5.5-2.5 1.5-2.5 3v3c0 1.8-.5 3-3 3\"/></g>",
  ],
  "track-data-engineering": [
    "<g transform=\"translate(0,-1)\"><path d=\"M4 5h16l-6.4 6.8v4.7L11 18.5v-6.7z\"/><path d=\"M11 18.5V21\"/></g>",
  ],
  "track-databases": [
    "<ellipse cx=\"12\" cy=\"6\" rx=\"7\" ry=\"2.5\"/>",
    "<path d=\"M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6\"/>",
    "<path d=\"M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5\"/>",
  ],
  "track-deployment": [
    "<g transform=\"translate(0,0.75)\"><path d=\"M4 15v4.5h16V15\"/><path d=\"M12 3v9\"/><path d=\"M8.5 6.5L12 3l3.5 3.5\"/></g>",
  ],
  "track-distributed": [
    "<circle cx=\"6\" cy=\"6\" r=\"2.2\"/>",
    "<circle cx=\"18\" cy=\"6\" r=\"2.2\"/>",
    "<circle cx=\"12\" cy=\"18\" r=\"2.2\"/>",
    "<path d=\"M8.2 6h7.6\"/>",
    "<path d=\"M7 8.1l4 7.9\"/>",
    "<path d=\"M17 8.1l-4 7.9\"/>",
  ],
  "track-docker": [
    "<g transform=\"translate(0,0.75)\"><rect x=\"3.5\" y=\"8\" width=\"17\" height=\"9\" rx=\"1.5\"/><path d=\"M8 8v9\"/><path d=\"M12 8v9\"/><path d=\"M16 8v9\"/><path d=\"M7 8V5.5h10V8\"/></g>",
  ],
  "track-engineering-practice": [
    "<rect x=\"6\" y=\"4.5\" width=\"12\" height=\"16\" rx=\"2\"/>",
    "<path d=\"M9.5 4.5V3h5v1.5\"/>",
    "<path d=\"M9.3 11.5l2 2 3.6-4.2\"/>",
    "<path d=\"M9.5 16.5h5\"/>",
  ],
  "track-frontend": [
    "<rect x=\"4\" y=\"4\" width=\"16\" height=\"16\" rx=\"2\"/>",
    "<path d=\"M4 10h16\"/>",
    "<path d=\"M10 10v10\"/>",
  ],
  "track-git": [
    "<path d=\"M6 4v11\"/>",
    "<circle cx=\"6\" cy=\"18\" r=\"2.2\"/>",
    "<circle cx=\"18\" cy=\"6\" r=\"2.2\" fill=\"currentColor\" stroke=\"none\"/>",
    "<path d=\"M15.8 6H13a4 4 0 0 0-4 4v5.8\"/>",
  ],
  "track-go": [
    "<circle cx=\"9\" cy=\"12\" r=\"5.5\"/>",
    "<circle cx=\"15\" cy=\"12\" r=\"5.5\"/>",
  ],
  "track-js-engine": [
    "<circle cx=\"12\" cy=\"12\" r=\"3\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
    "<path d=\"M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7\"/>",
  ],
  "track-linux": [
    "<g transform=\"translate(0,-1)\"><ellipse cx=\"12\" cy=\"13\" rx=\"6\" ry=\"7\"/><path d=\"M6.5 12.5C5 13.5 4.5 15.5 5.5 17\"/><path d=\"M17.5 12.5c1.5 1 2 3 1 4.5\"/><circle cx=\"10\" cy=\"10\" r=\"0.9\"/><circle cx=\"14\" cy=\"10\" r=\"0.9\"/><path d=\"M10.8 12.5h2.4L12 14.5z\"/></g>",
  ],
  "track-logic": [
    "<path d=\"M7 5v14h4a7 7 0 0 0 0-14H7z\"/>",
    "<path d=\"M3.5 9H7\"/>",
    "<path d=\"M3.5 15H7\"/>",
    "<path d=\"M18 12h2.5\"/>",
  ],
  "track-math": [
    "<path d=\"M4 4v16h16\"/>",
    "<path d=\"M6 18c6 0 9-5 12-12\"/>",
  ],
  "track-nest": [
    "<rect x=\"3\" y=\"3\" width=\"12\" height=\"12\" rx=\"1.5\"/>",
    "<rect x=\"9\" y=\"9\" width=\"12\" height=\"12\" rx=\"1.5\"/>",
  ],
  "track-networking": [
    "<circle cx=\"12\" cy=\"12\" r=\"8\"/>",
    "<ellipse cx=\"12\" cy=\"12\" rx=\"3.5\" ry=\"8\"/>",
    "<path d=\"M4 12h16\"/>",
  ],
  "track-nextjs": [
    "<path d=\"M12 5l8 14H4z\"/>",
  ],
  "track-node": [
    "<path d=\"M12 2.8l7.6 4.4v8.6L12 20.2l-7.6-4.4V7.2L12 2.8Z\"/>",
    "<path d=\"M12 12V7.5M12 12l-3.8 2.2M12 12l3.8 2.2\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-observability": [
    "<path d=\"M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.8\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-performance": [
    "<path d=\"M4 16a8 8 0 0 1 16 0\"/>",
    "<path d=\"M12 16l4.2-5\"/>",
    "<circle cx=\"12\" cy=\"16\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-python": [
    "<path d=\"M3 9c3-4 6 4 9 0s6 4 9 0\"/>",
    "<path d=\"M3 15c3-4 6 4 9 0s6 4 9 0\"/>",
  ],
  "track-queues": [
    "<path d=\"M3 7.5h7\"/>",
    "<path d=\"M3 16.5h7\"/>",
    "<path d=\"M3 12h4\"/>",
    "<circle cx=\"10\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
    "<path d=\"M13.5 12H21\"/>",
    "<path d=\"M18 9l3 3-3 3\"/>",
  ],
  "track-react": [
    "<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"3.7\"/>",
    "<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"3.7\" transform=\"rotate(60 12 12)\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-react-patterns": [
    "<rect x=\"4\" y=\"4.5\" width=\"5.5\" height=\"5.5\" rx=\"1\"/>",
    "<rect x=\"14.5\" y=\"4.5\" width=\"5.5\" height=\"5.5\" rx=\"1\"/>",
    "<rect x=\"9.25\" y=\"14\" width=\"5.5\" height=\"5.5\" rx=\"1\"/>",
    "<path d=\"M6.7 10v2l2.6 2\"/>",
    "<path d=\"M17.3 10v2l-2.6 2\"/>",
    "<circle cx=\"12\" cy=\"16.75\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
  "track-security": [
    "<path d=\"M12 3l7 2.6v5.2c0 4.8-2.9 7.7-7 10.2-4.1-2.5-7-5.4-7-10.2V5.6z\"/>",
    "<circle cx=\"12\" cy=\"10.4\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
    "<path d=\"M12 12v3\"/>",
  ],
  "track-security-cloud": [
    "<path d=\"M12 3l7 2.5v5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5v-5L12 3z\"/>",
    "<path d=\"M9 13.6a1.9 1.9 0 0 1 .5-3.7 2.7 2.7 0 0 1 5.3.9 1.75 1.75 0 0 1-.5 3.3H9z\"/>",
  ],
  "track-security-defensive": [
    "<path d=\"M12 3l7 2.5v5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5v-5L12 3z\"/>",
    "<path d=\"M9 11.5l2.2 2.2 4.3-4.2\"/>",
  ],
  "track-security-foundations": [
    "<path d=\"M12 3l7 2.5v5c0 4.5-3 7.5-7 9.5-4-2-7-5-7-9.5v-5L12 3z\"/>",
    "<path d=\"M8 21h8\"/>",
  ],
  "track-security-offensive": [
    "<circle cx=\"12\" cy=\"12\" r=\"5\"/>",
    "<path d=\"M12 3.5v2.5\"/>",
    "<path d=\"M12 18v2.5\"/>",
    "<path d=\"M3.5 12H6\"/>",
    "<path d=\"M18 12h2.5\"/>",
    "<path d=\"M8 16L16 8\"/>",
    "<path d=\"M13.8 5.8l4.4 4.4\"/>",
  ],
  "track-sql-postgres": [
    "<rect x=\"4\" y=\"5\" width=\"16\" height=\"14\" rx=\"2\"/>",
    "<line x1=\"4\" y1=\"10\" x2=\"20\" y2=\"10\"/>",
    "<line x1=\"7\" y1=\"13.5\" x2=\"17\" y2=\"13.5\"/>",
    "<line x1=\"7\" y1=\"16.5\" x2=\"13.5\" y2=\"16.5\"/>",
  ],
  "track-system-design": [
    "<path d=\"M12 3l9 4.7-9 4.7-9-4.7L12 3Z\"/>",
    "<path d=\"M4.5 12.3l7.5 3.9 7.5-3.9\"/>",
    "<path d=\"M4.5 16.6l7.5 3.9 7.5-3.9\"/>",
  ],
  "track-system-design-cases": [
    "<g transform=\"translate(-0.5,-1.25)\"><path d=\"M3.5 7.5L8 5l4.5 2.5v5L8 15 3.5 12.5v-5Z\"/><path d=\"M3.5 7.5L8 10l4.5-2.5M8 10v5\"/><circle cx=\"15.5\" cy=\"15.5\" r=\"4.2\"/><path d=\"M18.6 18.6L21.5 21.5\"/></g>",
  ],
  "track-typescript": [
    "<path d=\"M9 7L4 12l5 5\"/>",
    "<path d=\"M15 7l5 5-5 5\"/>",
    "<circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
  ],
} as const;

export type IconName = keyof typeof ICON_PATHS;
