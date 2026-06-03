// site/src/german/xp.ts
// XP contributed by German study, kept tiny and additive so it slots into the
// site's derived XP without coupling the progression module to German.
// Mirrors site/src/english/xp.ts.

export const GERMAN_XP_PER_KNOWN = 5;

export function germanXp(knownWords: number): number {
  return Math.max(0, knownWords) * GERMAN_XP_PER_KNOWN;
}
