// src/english/speech/diff.ts
export type ShadowToken = {
  target: string;
  status: "ok" | "missing" | "sub";
  heard?: string;
};
export type ShadowResult = { score: number; tokens: ShadowToken[] };

export function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Word-level Levenshtein alignment of `said` against `target`.
 * said   — first arg: the reference phrase (what should have been said)
 * target — second arg: what was actually heard/transcribed
 * Tokens label each SAID (reference) word as ok / missing / sub.
 */
export function scoreShadow(said: string, target: string): ShadowResult {
  const a = normalizeWords(said);    // reference
  const b = normalizeWords(target);  // heard
  const n = a.length, m = b.length;
  // DP edit-distance table with backpointers.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  // Backtrace to label each reference word.
  const tokens: ShadowToken[] = [];
  let i = n, j = m, matched = 0;
  while (i > 0) {
    if (j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] === b[j - 1]) { tokens.push({ target: a[i - 1], status: "ok", heard: b[j - 1] }); matched++; }
      else tokens.push({ target: a[i - 1], status: "sub", heard: b[j - 1] });
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j] + 1) {
      tokens.push({ target: a[i - 1], status: "missing" });
      i--;
    } else {
      j--; // extra heard word; ignore for reference labeling
    }
  }
  tokens.reverse();
  const score = n === 0 ? 0 : matched / n;
  return { score, tokens };
}
