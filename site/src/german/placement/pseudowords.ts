// site/src/german/placement/pseudowords.ts
// Plausible German-looking non-words: phonotactically valid (legal onsets/codas,
// German graphemes like sch/ch/pf/ä/ö/ü) but NOT real words. Used as guess
// controls — a "yes" on any of these is a false alarm and discounts the real-word
// hit rate. None is a real German word.
export const PSEUDOWORDS: string[] = [
  "schlürf", "Frümpel", "knaster", "Plötung", "verschimmen", "Quärbe",
  "strobenz", "Mürkling", "glaschen", "Tröpfung", "Schwankel", "bredisch",
  "Knörbe", "flachsen", "Würmnis", "Pflastung", "drönken", "Schmölf",
];
