// For each target lemma, find the first sentence of the pasted text that contains it — the
// methodology mines SENTENCES ("вот так это говорится"), not words. Light splitter, no NLP.
export function suggestChunkSentences(text: string, lemmas: string[]): { lemma: string; sentence: string }[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 8 && s.length <= 240);
  const out: { lemma: string; sentence: string }[] = [];
  for (const lemma of lemmas) {
    const re = new RegExp(`\\b${lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    const hit = sentences.find((s) => re.test(s));
    if (hit) out.push({ lemma, sentence: hit });
  }
  return out;
}
