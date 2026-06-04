// site/src/german/data/reading/a1-engineering-2.ts
// A1 engineering-stream reading text. Easy dev German with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape
// (German text in the `en`/`q.en`/`options[].en` slots, Russian in `ru`).
import type { ReadingUnit } from "~/german/types";

export const a1Engineering2: ReadingUnit = {
  id: "de-a1-engineering-2",
  level: "A1",
  stream: "engineering",
  title: { en: "Der erste Arbeitstag", ru: "Первый рабочий день" },
  blurb: {
    en: "Ganz einfache Sätze über den Morgen eines neuen Entwicklers: Laptop, E-Mail, Meeting.",
    ru: "Совсем простые предложения об утре начинающего разработчика: ноутбук, имейл, митинг.",
  },
  source: {
    en: "Notiz eines neuen Entwicklers (A1)",
    ru: "Заметка начинающего разработчика (A1)",
  },
  passages: [
    {
      de: "Hallo! Ich bin Max. Ich bin Entwickler. Heute ist mein erster Arbeitstag. Ich bin neu im Team.",
      ru: "Привет! Я Макс. Я разработчик. Сегодня мой первый рабочий день. Я новенький в команде.",
    },
    {
      de: "Ich komme um neun Uhr ins Büro. Ich öffne den Laptop. Dann trinke ich einen Kaffee.",
      ru: "Я прихожу в офис в девять часов. Я открываю ноутбук. Потом я пью кофе.",
    },
    {
      de: "Zuerst lese ich meine E-Mails. Ich habe drei neue E-Mails. Eine E-Mail ist von meinem Chef.",
      ru: "Сначала я читаю свои имейлы. У меня три новых имейла. Один имейл от моего начальника.",
    },
    {
      de: "Um zehn Uhr ist das Meeting. Das Team spricht über die Arbeit. Das Meeting ist kurz.",
      ru: "В десять часов митинг. Команда говорит о работе. Митинг короткий.",
    },
    {
      de: "Dann schreibe ich Code. Ich schreibe auch einen Test. Der Test ist grün. Ich bin glücklich.",
      ru: "Потом я пишу код. Я также пишу тест. Тест зелёный. Я счастлив.",
    },
  ],
  phrases: [
    {
      id: "de-a1e2-p1",
      en: "Ich öffne den Laptop.",
      ru: "Я открываю ноутбук.",
      note: {
        en: "'öffnen' = to open; 'der Laptop' is masculine, so 'den' in the accusative.",
        ru: "'öffnen' = открывать; 'der Laptop' — мужского рода, поэтому 'den' в винительном падеже.",
      },
    },
    {
      id: "de-a1e2-p2",
      en: "Ich lese meine E-Mails.",
      ru: "Я читаю свои имейлы.",
      note: {
        en: "'die E-Mail' keeps the hyphen and the capital M in German.",
        ru: "'die E-Mail' в немецком пишется с дефисом и заглавной M.",
      },
    },
    {
      id: "de-a1e2-p3",
      en: "Ich schreibe Code.",
      ru: "Я пишу код.",
      note: {
        en: "'der Code' is used without an article here, like 'I write code'.",
        ru: "'der Code' здесь без артикля, как «я пишу код».",
      },
    },
    {
      id: "de-a1e2-p4",
      en: "Der Test ist grün.",
      ru: "Тест зелёный.",
      note: {
        en: "'grün' (green) means the test passes, just like in English.",
        ru: "'grün' (зелёный) значит, что тест проходит, как и в английском.",
      },
    },
  ],
  questions: [
    {
      id: "de-a1e2-q1",
      q: { en: "Was macht Max zuerst im Büro?", ru: "Что Макс делает в офисе сначала?" },
      options: [
        { en: "Er schreibt Code.", ru: "Он пишет код." },
        { en: "Er öffnet den Laptop und trinkt Kaffee.", ru: "Он открывает ноутбук и пьёт кофе." },
        { en: "Er geht nach Hause.", ru: "Он идёт домой." },
      ],
      answer: 1,
      explain: {
        en: "He says 'Ich öffne den Laptop. Dann trinke ich einen Kaffee.'",
        ru: "Он говорит «Ich öffne den Laptop. Dann trinke ich einen Kaffee».",
      },
    },
    {
      id: "de-a1e2-q2",
      q: { en: "Wie viele E-Mails hat Max?", ru: "Сколько имейлов у Макса?" },
      options: [
        { en: "Eine E-Mail", ru: "Один имейл" },
        { en: "Zwei E-Mails", ru: "Два имейла" },
        { en: "Drei E-Mails", ru: "Три имейла" },
      ],
      answer: 2,
      explain: {
        en: "He says 'Ich habe drei neue E-Mails.'",
        ru: "Он говорит «Ich habe drei neue E-Mails» (У меня три новых имейла).",
      },
    },
    {
      id: "de-a1e2-q3",
      q: { en: "Wann ist das Meeting?", ru: "Когда митинг?" },
      options: [
        { en: "Um neun Uhr", ru: "В девять часов" },
        { en: "Um zehn Uhr", ru: "В десять часов" },
        { en: "Um elf Uhr", ru: "В одиннадцать часов" },
      ],
      answer: 1,
      explain: {
        en: "He says 'Um zehn Uhr ist das Meeting.'",
        ru: "Он говорит «Um zehn Uhr ist das Meeting» (В десять часов митинг).",
      },
    },
  ],
  targetWords: ["der Code", "die E-Mail", "das Meeting", "der Test", "öffnen"],
};
