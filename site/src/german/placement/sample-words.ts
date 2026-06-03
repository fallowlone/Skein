// site/src/german/placement/sample-words.ts
// Stratified real-word sample for the German vocab-size placement test. Lemmas are
// genuine German words; ranks are rough frequency positions chosen to sit inside
// their band's cutoff (A1 ≤600, A2 601–1600, B1 >1600). ~50 words across bands.
// Mirrors site/src/english/placement/sample-words.ts.
import type { GerBand } from "~/german/types";

export type SampleWord = { lemma: string; rank: number; band: GerBand };

export const SAMPLE_WORDS: SampleWord[] = [
  // A1 — everyday core (rank ≤ 600)
  { lemma: "und", rank: 5, band: "A1" },
  { lemma: "haben", rank: 20, band: "A1" },
  { lemma: "gut", rank: 60, band: "A1" },
  { lemma: "machen", rank: 90, band: "A1" },
  { lemma: "Tag", rank: 120, band: "A1" },
  { lemma: "Haus", rank: 160, band: "A1" },
  { lemma: "Wasser", rank: 200, band: "A1" },
  { lemma: "gehen", rank: 240, band: "A1" },
  { lemma: "Frau", rank: 280, band: "A1" },
  { lemma: "Kind", rank: 320, band: "A1" },
  { lemma: "neu", rank: 360, band: "A1" },
  { lemma: "schnell", rank: 400, band: "A1" },
  { lemma: "schreiben", rank: 440, band: "A1" },
  { lemma: "Frage", rank: 480, band: "A1" },
  { lemma: "Arbeit", rank: 520, band: "A1" },
  { lemma: "heute", rank: 560, band: "A1" },
  { lemma: "Auto", rank: 600, band: "A1" },
  // A2 — common (rank 601–1600)
  { lemma: "wichtig", rank: 660, band: "A2" },
  { lemma: "vielleicht", rank: 740, band: "A2" },
  { lemma: "erklären", rank: 820, band: "A2" },
  { lemma: "Möglichkeit", rank: 900, band: "A2" },
  { lemma: "entscheiden", rank: 980, band: "A2" },
  { lemma: "Erfahrung", rank: 1060, band: "A2" },
  { lemma: "wahrscheinlich", rank: 1140, band: "A2" },
  { lemma: "Beziehung", rank: 1220, band: "A2" },
  { lemma: "verändern", rank: 1300, band: "A2" },
  { lemma: "Gesellschaft", rank: 1380, band: "A2" },
  { lemma: "Entwicklung", rank: 1440, band: "A2" },
  { lemma: "Verantwortung", rank: 1500, band: "A2" },
  { lemma: "berücksichtigen", rank: 1540, band: "A2" },
  { lemma: "Eigenschaft", rank: 1570, band: "A2" },
  { lemma: "Zusammenhang", rank: 1590, band: "A2" },
  { lemma: "ausreichend", rank: 1600, band: "A2" },
  // B1 — less common / abstract (rank > 1600)
  { lemma: "Voraussetzung", rank: 1700, band: "B1" },
  { lemma: "nachvollziehbar", rank: 1800, band: "B1" },
  { lemma: "Beeinträchtigung", rank: 1900, band: "B1" },
  { lemma: "gewährleisten", rank: 2000, band: "B1" },
  { lemma: "Bestandteil", rank: 2100, band: "B1" },
  { lemma: "Auswirkung", rank: 2200, band: "B1" },
  { lemma: "umfangreich", rank: 2300, band: "B1" },
  { lemma: "Schwierigkeit", rank: 2400, band: "B1" },
  { lemma: "verlässlich", rank: 2500, band: "B1" },
  { lemma: "Wahrnehmung", rank: 2600, band: "B1" },
  { lemma: "ermöglichen", rank: 2700, band: "B1" },
  { lemma: "Grundlage", rank: 2800, band: "B1" },
  { lemma: "Zuverlässigkeit", rank: 2900, band: "B1" },
  { lemma: "beträchtlich", rank: 3000, band: "B1" },
  { lemma: "Übereinstimmung", rank: 3100, band: "B1" },
  { lemma: "vorausgesetzt", rank: 3200, band: "B1" },
];
