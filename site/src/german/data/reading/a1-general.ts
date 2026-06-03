// site/src/german/data/reading/a1-general.ts
// A1 general-stream reading text. German passages with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape
// (German text in the `en`/`q.en`/`options[].en` slots, Russian in `ru`).
import type { ReadingUnit } from "~/german/types";

export const a1General: ReadingUnit = {
  id: "de-a1-general",
  level: "A1",
  stream: "general",
  title: { en: "Ein neuer Tag", ru: "Новый день" },
  blurb: {
    en: "Ganz einfache Sätze über einen Morgen: aufstehen, frühstücken, zur Arbeit gehen.",
    ru: "Совсем простые предложения об утре: проснуться, позавтракать, пойти на работу.",
  },
  source: {
    en: "Tagebuch-Eintrag (A1) — diary entry",
    ru: "Запись в дневнике (A1)",
  },
  passages: [
    {
      de: "Hallo! Ich heiße Lena. Ich bin dreißig Jahre alt. Ich wohne in Berlin. Ich spreche ein bisschen Deutsch.",
      ru: "Привет! Меня зовут Лена. Мне тридцать лет. Я живу в Берлине. Я немного говорю по-немецки.",
    },
    {
      de: "Ich stehe um sieben Uhr auf. Ich trinke Kaffee und esse ein Brot. Das Frühstück ist klein, aber gut.",
      ru: "Я встаю в семь часов. Я пью кофе и ем хлеб. Завтрак маленький, но вкусный.",
    },
    {
      de: "Dann gehe ich zur Arbeit. Ich nehme den Bus. Der Bus kommt um acht Uhr. Die Fahrt ist kurz.",
      ru: "Потом я иду на работу. Я еду на автобусе. Автобус приходит в восемь часов. Поездка короткая.",
    },
    {
      de: "Am Abend bin ich müde. Ich koche Suppe und lese ein Buch. Um elf Uhr gehe ich ins Bett. Gute Nacht!",
      ru: "Вечером я устала. Я готовлю суп и читаю книгу. В одиннадцать часов я ложусь спать. Спокойной ночи!",
    },
  ],
  phrases: [
    {
      id: "de-a1g-p1",
      en: "Ich heiße …",
      ru: "Меня зовут …",
      note: {
        en: "The basic way to say your name in German.",
        ru: "Базовый способ назвать своё имя по-немецки.",
      },
    },
    {
      id: "de-a1g-p2",
      en: "Ich wohne in …",
      ru: "Я живу в …",
      note: {
        en: "Use the city or place after 'in'. 'wohnen' = to live/reside.",
        ru: "После 'in' ставится город или место. 'wohnen' = жить (проживать).",
      },
    },
    {
      id: "de-a1g-p3",
      en: "Ich stehe … auf.",
      ru: "Я встаю в …",
      note: {
        en: "'aufstehen' is a separable verb; 'auf' jumps to the end of the sentence.",
        ru: "'aufstehen' — отделяемый глагол; приставка 'auf' уходит в конец предложения.",
      },
    },
    {
      id: "de-a1g-p4",
      en: "Gute Nacht!",
      ru: "Спокойной ночи!",
      note: {
        en: "Said before going to sleep.",
        ru: "Говорят перед сном.",
      },
    },
  ],
  questions: [
    {
      id: "de-a1g-q1",
      q: { en: "Wo wohnt Lena?", ru: "Где живёт Лена?" },
      options: [
        { en: "In München", ru: "В Мюнхене" },
        { en: "In Berlin", ru: "В Берлине" },
        { en: "In Hamburg", ru: "В Гамбурге" },
      ],
      answer: 1,
      explain: {
        en: "She says 'Ich wohne in Berlin.'",
        ru: "Она говорит «Ich wohne in Berlin» (Я живу в Берлине).",
      },
    },
    {
      id: "de-a1g-q2",
      q: { en: "Was trinkt Lena am Morgen?", ru: "Что Лена пьёт утром?" },
      options: [
        { en: "Tee", ru: "Чай" },
        { en: "Wasser", ru: "Воду" },
        { en: "Kaffee", ru: "Кофе" },
      ],
      answer: 2,
      explain: {
        en: "She says 'Ich trinke Kaffee.'",
        ru: "Она говорит «Ich trinke Kaffee» (Я пью кофе).",
      },
    },
    {
      id: "de-a1g-q3",
      q: { en: "Wie fährt Lena zur Arbeit?", ru: "Как Лена добирается на работу?" },
      options: [
        { en: "Mit dem Bus", ru: "На автобусе" },
        { en: "Mit dem Auto", ru: "На машине" },
        { en: "Zu Fuß", ru: "Пешком" },
      ],
      answer: 0,
      explain: {
        en: "She says 'Ich nehme den Bus.'",
        ru: "Она говорит «Ich nehme den Bus» (Я еду на автобусе).",
      },
    },
  ],
  targetWords: ["wohnen", "trinken", "essen", "aufstehen", "müde"],
};
