const BUDGETS: Record<string, number> = {
  crux: 180,
  "key-takeaway": 220,
  misconception: 320,
  annot: 240,
};
const TAG_RE = /<([a-z]+)[^>]*data-text-class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g;

/**
 * Visible text of an HTML fragment. Char scanner, deliberately regex-free:
 * end-tag spacing/attribute tricks (</script bar>) cannot bypass it because
 * it never parses tag syntax — "<" opens a skip, the next ">" closes it,
 * and script/style bodies are skipped to their "</name" opener.
 */
function stripToText(input: string): string {
  const lower = input.toLowerCase();
  let out = "";
  let i = 0;
  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) { out += input.slice(i); break; }
    out += input.slice(i, lt);
    const gt = input.indexOf(">", lt + 1);
    if (gt === -1) break;
    const head = lower.slice(lt + 1, gt).trimStart();
    const blocked = head.startsWith("script") ? "script" : head.startsWith("style") ? "style" : null;
    if (!blocked) { i = gt + 1; continue; }
    const closeIdx = lower.indexOf(`</${blocked}`, gt + 1);
    if (closeIdx === -1) break;
    const closeEnd = input.indexOf(">", closeIdx + 1);
    i = closeEnd === -1 ? input.length : closeEnd + 1;
    out += " ";
  }
  return out.replace(/\s+/g, " ").trim();
}

export function checkTextBudgets(html: string, file: string): string[] {
  const errs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(html))) {
    const cls = m[2];
    // Plain char scanner, no tag-filter regex: immune to end-tag spacing
    // tricks (</script bar>, </script\t\n ...>) by construction.
    const text = stripToText(m[3]);
    const budget = BUDGETS[cls];
    if (budget !== undefined && text.length > budget) {
      errs.push(`${file}: ${cls} text exceeds ${budget} chars (got ${text.length})`);
    }
  }
  return errs;
}
