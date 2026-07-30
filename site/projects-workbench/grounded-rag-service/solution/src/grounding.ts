export type Chunk = { id: string; docId: string; text: string; start: number; end: number };

/**
 * Split a document into overlapping chunks.
 *
 * Overlap is not decoration: a fact that straddles a boundary is otherwise split in
 * half and retrieved by nobody. The trade is duplication, so overlap must be a
 * fraction of the window rather than "some extra text" — and a chunker that can emit
 * a zero-progress step will loop forever on a long document, which is why the step is
 * validated up front instead of trusted.
 */
export function chunk(docId: string, text: string, size: number, overlap: number): Chunk[] {
  if (size <= 0) throw new Error("size must be positive");
  if (overlap < 0) throw new Error("overlap must not be negative");
  if (overlap >= size) throw new Error("overlap must be smaller than size, or chunking never advances");

  const out: Chunk[] = [];
  const step = size - overlap;
  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(text.length, start + size);
    out.push({ id: `${docId}#${out.length}`, docId, text: text.slice(start, end), start, end });
    if (end === text.length) break;
  }
  return out;
}

export type Retrieved = { chunk: Chunk; score: number };

/**
 * Assemble the prompt context under a token budget.
 *
 * Two rules that keep answers honest:
 *  - highest score first, so truncation drops the least relevant material, not the
 *    most (a naive loop over retrieval order throws away the best chunk);
 *  - never include a partial chunk. Half a sentence reads as authoritative and is
 *    the cheapest way to invent a fact.
 */
export function selectContext(retrieved: Retrieved[], budget: number): Chunk[] {
  const sorted = [...retrieved].sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id));
  const out: Chunk[] = [];
  let used = 0;
  for (const { chunk: c } of sorted) {
    if (used + c.text.length > budget) continue;
    out.push(c);
    used += c.text.length;
  }
  return out;
}

export type Claim = { text: string; citations: string[] };
export type Answer = { claims: Claim[]; refused?: boolean };

export type GroundingIssue =
  | { kind: "uncited"; claim: string }
  | { kind: "unknown-citation"; claim: string; citation: string }
  | { kind: "unsupported"; claim: string; citation: string };

/**
 * Verify an answer against the context it was given.
 *
 * This is the check that separates RAG from a chatbot with extra steps. Three ways an
 * answer fails, all of them common:
 *  - a claim with no citation — fluent and unfalsifiable;
 *  - a citation to a chunk that was never in context — the model invented the source;
 *  - a citation whose chunk does not actually contain the claim's key terms — the
 *    footnote is decoration.
 */
export function verifyGrounding(answer: Answer, context: Chunk[]): GroundingIssue[] {
  const issues: GroundingIssue[] = [];
  const byId = new Map(context.map((c) => [c.id, c]));

  for (const claim of answer.claims) {
    if (claim.citations.length === 0) {
      issues.push({ kind: "uncited", claim: claim.text });
      continue;
    }
    for (const citation of claim.citations) {
      const cited = byId.get(citation);
      if (!cited) {
        issues.push({ kind: "unknown-citation", claim: claim.text, citation });
        continue;
      }
      if (!supports(cited.text, claim.text)) {
        issues.push({ kind: "unsupported", claim: claim.text, citation });
      }
    }
  }
  return issues;
}

const STOP = new Set([
  "the", "a", "an", "is", "are", "was", "were", "to", "of", "in", "on", "for", "and", "or",
  "that", "this", "it", "as", "by", "with", "from", "at", "be", "been", "has", "have", "had",
]);

/** Content words only, so stop-word overlap cannot fake support. */
export function keyTerms(text: string): string[] {
  return [...new Set(
    text.toLowerCase().replace(/[^a-z0-9\s%.-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)),
  )];
}

/** A claim is supported when most of its content words appear in the cited chunk. */
export function supports(chunkText: string, claim: string, threshold = 0.6): boolean {
  const terms = keyTerms(claim);
  if (terms.length === 0) return false;
  const haystack = chunkText.toLowerCase();
  const hits = terms.filter((t) => haystack.includes(t)).length;
  return hits / terms.length >= threshold;
}

/**
 * Refuse rather than guess.
 *
 * With no context above the relevance floor, the honest answer is "I don't know".
 * A service that always answers is a service whose answers cannot be trusted.
 */
export function shouldRefuse(retrieved: Retrieved[], minScore: number): boolean {
  return !retrieved.some((r) => r.score >= minScore);
}
