// site/src/english/xp.ts
// XP contributed by English study, kept tiny and additive so it slots into the
// site's derived xpFromState without coupling the progression module to English.

export const ENGLISH_XP_PER_KNOWN = 5;

export function englishXp(knownWords: number): number {
  return Math.max(0, knownWords) * ENGLISH_XP_PER_KNOWN;
}
