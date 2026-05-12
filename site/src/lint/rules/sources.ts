export function checkSources(html: string, file: string): string[] {
  const m = html.match(/<footer[^>]*>([\s\S]*?)<\/footer>/);
  if (!m) return [];
  const footer = m[1];
  // Skip the check if no piece-style sources panel present (chapter overviews have a generic footer).
  if (!/Sources/i.test(footer) && !/Источники/i.test(footer)) return [];
  if (!/<a [^>]*href="https?:\/\//.test(footer)) {
    return [`${file}: sources footer present but contains no external links`];
  }
  return [];
}
