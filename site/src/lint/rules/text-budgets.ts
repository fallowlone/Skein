const BUDGETS: Record<string, number> = {
  crux: 140,
  "key-takeaway": 220,
  misconception: 320,
  annot: 240,
};
const TAG_RE = /<([a-z]+)[^>]*data-text-class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;

export function checkTextBudgets(html: string, file: string): string[] {
  const errs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(html))) {
    const cls = m[2];
    const text = m[3].replace(/<[^>]+>/g, "").trim();
    const budget = BUDGETS[cls];
    if (budget !== undefined && text.length > budget) {
      errs.push(`${file}: ${cls} text exceeds ${budget} chars (got ${text.length})`);
    }
  }
  return errs;
}
