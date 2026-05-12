export function checkSpiralCues(html: string, file: string): string[] {
  const declared = html.match(/data-spiral=['"]([^'"]+)['"]/);
  if (!declared) return [];
  const threads: string[] = JSON.parse(declared[1].replace(/&quot;/g, '"'));
  const warnings: string[] = [];
  for (const t of threads) {
    const re = new RegExp(`href=['"]/(en|ru)/threads/${t}/['"]`);
    if (!re.test(html)) warnings.push(`${file}: spiral thread "${t}" declared but no <SpiralCue> rendered`);
  }
  return warnings;
}
