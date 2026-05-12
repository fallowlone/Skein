export function checkTierAccordion(html: string, file: string): string[] {
  const errs: string[] = [];
  const sections = html.match(/<section[^>]*class="[^"]*tier-accordion[^"]*"[\s\S]*?<\/section>/g) ?? [];
  for (const sec of sections) {
    if (!/data-tier=['"]middle['"]/.test(sec)) {
      errs.push(`${file}: tier-accordion missing required "middle" tier`);
    }
  }
  return errs;
}
