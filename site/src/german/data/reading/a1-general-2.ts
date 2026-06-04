// site/src/german/data/reading/a1-general-2.ts
// A1 general-stream reading text. German passages with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape
// (German text in the `en`/`q.en`/`options[].en` slots, Russian in `ru`).
import type { ReadingUnit } from "~/german/types";

export const a1General2: ReadingUnit = {
  id: "de-a1-general-2",
  level: "A1",
  stream: "general",
  title: { en: "Das Wochenende", ru: "Выходные" },
  blurb: {
    en: "Ganz einfache Sätze über das Wochenende: schlafen, einkaufen, Freunde treffen.",
    ru: "Совсем простые предложения о выходных: спать, ходить за покупками, встречаться с друзьями.",
  },
  source: {
    en: "Tagebuch-Eintrag (A1) — diary entry",
    ru: "Запись в дневнике (A1)",
  },
  passages: [
    {
      de: "Hallo! Ich bin Tom. Heute ist Samstag. Ich arbeite nicht. Das Wochenende ist frei.",
      ru: "Привет! Я Том. Сегодня суббота. Я не работаю. Выходные свободны.",
    },
    {
      de: "Am Samstag schlafe ich lange. Ich stehe um zehn Uhr auf. Dann trinke ich Kaffee und höre Musik.",
      ru: "В субботу я долго сплю. Я встаю в десять часов. Потом я пью кофе и слушаю музыку.",
    },
    {
      de: "Am Nachmittag gehe ich einkaufen. Ich kaufe Brot, Käse und Obst. Der Supermarkt ist nah.",
      ru: "Днём я иду за покупками. Я покупаю хлеб, сыр и фрукты. Супермаркет рядом.",
    },
    {
      de: "Am Abend treffe ich meine Freunde. Wir essen Pizza und spielen ein Spiel. Es macht Spaß.",
      ru: "Вечером я встречаюсь с друзьями. Мы едим пиццу и играем в игру. Это весело.",
    },
    {
      de: "Am Sonntag mache ich nichts. Ich bin zu Hause und ruhe mich aus. Das Wochenende ist schön.",
      ru: "В воскресенье я ничего не делаю. Я дома и отдыхаю. Выходные прекрасны.",
    },
  ],
  phrases: [
    {
      id: "de-a1g2-p1",
      en: "Das Wochenende ist frei.",
      ru: "Выходные свободны.",
      note: {
        en: "'frei' here means free / not busy with work.",
        ru: "'frei' здесь значит свободный / не занятый работой.",
      },
    },
    {
      id: "de-a1g2-p2",
      en: "Ich gehe einkaufen.",
      ru: "Я иду за покупками.",
      note: {
        en: "'einkaufen gehen' = to go shopping (for groceries).",
        ru: "'einkaufen gehen' = идти за покупками (продукты).",
      },
    },
    {
      id: "de-a1g2-p3",
      en: "Es macht Spaß.",
      ru: "Это весело.",
      note: {
        en: "A very common phrase to say something is fun.",
        ru: "Очень распространённая фраза, чтобы сказать, что что-то весело.",
      },
    },
    {
      id: "de-a1g2-p4",
      en: "Ich ruhe mich aus.",
      ru: "Я отдыхаю.",
      note: {
        en: "'sich ausruhen' is a reflexive, separable verb; 'aus' goes to the end.",
        ru: "'sich ausruhen' — возвратный, отделяемый глагол; приставка 'aus' уходит в конец.",
      },
    },
  ],
  questions: [
    {
      id: "de-a1g2-q1",
      q: { en: "Wann steht Tom am Samstag auf?", ru: "Когда Том встаёт в субботу?" },
      options: [
        { en: "Um sieben Uhr", ru: "В семь часов" },
        { en: "Um zehn Uhr", ru: "В десять часов" },
        { en: "Um zwölf Uhr", ru: "В двенадцать часов" },
      ],
      answer: 1,
      explain: {
        en: "He says 'Ich stehe um zehn Uhr auf.'",
        ru: "Он говорит «Ich stehe um zehn Uhr auf» (Я встаю в десять часов).",
      },
    },
    {
      id: "de-a1g2-q2",
      q: { en: "Was kauft Tom im Supermarkt?", ru: "Что Том покупает в супермаркете?" },
      options: [
        { en: "Brot, Käse und Obst", ru: "Хлеб, сыр и фрукты" },
        { en: "Milch und Tee", ru: "Молоко и чай" },
        { en: "Fleisch und Fisch", ru: "Мясо и рыбу" },
      ],
      answer: 0,
      explain: {
        en: "He says 'Ich kaufe Brot, Käse und Obst.'",
        ru: "Он говорит «Ich kaufe Brot, Käse und Obst» (Я покупаю хлеб, сыр и фрукты).",
      },
    },
    {
      id: "de-a1g2-q3",
      q: { en: "Was macht Tom am Abend?", ru: "Что Том делает вечером?" },
      options: [
        { en: "Er arbeitet im Büro.", ru: "Он работает в офисе." },
        { en: "Er trifft seine Freunde.", ru: "Он встречается с друзьями." },
        { en: "Er geht ins Bett.", ru: "Он ложится спать." },
      ],
      answer: 1,
      explain: {
        en: "He says 'Am Abend treffe ich meine Freunde.'",
        ru: "Он говорит «Am Abend treffe ich meine Freunde» (Вечером я встречаюсь с друзьями).",
      },
    },
  ],
  targetWords: ["das Wochenende", "schlafen", "einkaufen", "treffen", "sich ausruhen"],
};
