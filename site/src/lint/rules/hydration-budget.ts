export function checkHydrationBudget(html: string, file: string): string[] {
  // Piece pages: dist/<lang>/<pillar>/<piece>/index.html (4 segments after dist).
  // Nav pages (home, chapter overview, settings, threads index) are exempt — they legitimately render N progress meters / language switches per item.
  const afterDist = file.split(/[\\/]dist[\\/]/)[1] ?? "";
  const segments = afterDist.split("/").filter(Boolean);
  // segments for a piece page: ["en", "networking", "03-tcp-handshake", "index.html"] = 4
  const isPiece = segments.length === 4;
  if (!isPiece) return [];
  const matches = html.match(/<astro-island\b/g);
  const count = matches?.length ?? 0;
  // Budget 7 = piece-page hydration cap (retained for historical compatibility; no piece pages currently exist).
  if (count > 7) return [`${file}: ${count} hydration islands (max 7 on piece pages)`];
  return [];
}
