// Curated external listening/immersion library (the engine we deliberately don't build). Small,
// vetted set of stable channel/show landing pages (not deep-links that rot fast) — easy to refresh.
// Bilingual "how to use" lives here; the section copy lives in the component.
import type { Band } from "../types";

export type ListenItem = {
  title: string;
  url: string;
  kind: "video" | "audio";
  minutes: number;
  band: Band;
  how: { en: string; ru: string }; // intensive/extensive guidance, one line
};

export const listening: ListenItem[] = [
  { title: "Database indexing, visually — ByteByteGo", url: "https://www.youtube.com/@ByteByteGo", kind: "video", minutes: 12, band: "B2",
    how: { en: "intensive: rewatch with captions", ru: "интенсивно: пересмотри с субтитрами" } },
  { title: "How TLS actually works — Computerphile", url: "https://www.youtube.com/@Computerphile", kind: "video", minutes: 18, band: "B1",
    how: { en: "intensive: shadow the narrator", ru: "интенсивно: повторяй за диктором" } },
  { title: "Software Engineering Radio — interviews", url: "https://www.se-radio.net/", kind: "audio", minutes: 41, band: "B2",
    how: { en: "extensive: listen once for gist", ru: "экстенсивно: слушай раз для общего смысла" } },
  { title: "The Changelog — engineering podcast", url: "https://changelog.com/podcast", kind: "audio", minutes: 60, band: "B2",
    how: { en: "extensive: background listening for volume", ru: "экстенсивно: фоновое слушание для объёма" } },
  { title: "Hussein Nasser — backend deep dives", url: "https://www.youtube.com/@hnasr", kind: "video", minutes: 20, band: "B1",
    how: { en: "intensive: pause and mine 5 new terms", ru: "интенсивно: ставь на паузу, выпиши 5 новых слов" } },
  { title: "Krazam — tech satire (light immersion)", url: "https://www.youtube.com/@Krazam", kind: "video", minutes: 5, band: "B1",
    how: { en: "extensive: fun input, no pausing", ru: "экстенсивно: лёгкий ввод, без пауз" } },
];
