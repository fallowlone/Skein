// Split pasted English text into normalized lemma tokens with frequency counts. Deliberately
// lightweight (no NLP dependency): lowercase, strip punctuation, drop numbers/urls/1-char tokens.
// Folding is intentionally MINIMAL and reliable — only regular plural/3rd-person "s" and "ies→y"
// — so it never produces a wrong stem. Irregular/verb inflections are left as-is (they simply fall
// through to "technical/unknown" in classify rather than mis-merging). Precision over recall.
export type Lemma = { lemma: string; count: number };

function fold(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length >= 5) return w.slice(0, -3) + "y";   // studies→study, queries→query
  if (w.endsWith("s") && !w.endsWith("ss") && w.length >= 4) return w.slice(0, -1); // servers→server, queues→queue
  return w;
}

export function tokenizeToLemmas(text: string): Lemma[] {
  const counts = new Map<string, number>();
  for (const raw of text.split(/\s+/)) {
    if (!raw) continue;
    if (/^https?:\/\//i.test(raw) || /\d/.test(raw)) continue; // urls, anything with a digit
    const w = raw.toLowerCase().replace(/[^a-z']/g, "").replace(/^'+|'+$/g, "").replace(/'s$/, "");
    if (w.length < 2) continue;
    const lemma = fold(w);
    if (lemma.length < 2) continue;
    counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
  }
  return [...counts.entries()].map(([lemma, count]) => ({ lemma, count })).sort((a, b) => b.count - a.count);
}
