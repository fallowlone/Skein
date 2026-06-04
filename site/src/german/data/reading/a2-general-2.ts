// site/src/german/data/reading/a2-general-2.ts
// A2 general-stream reading text. German passages with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape
// (German text in the `en`/`q.en`/`options[].en` slots, Russian in `ru`).
import type { ReadingUnit } from "~/german/types";

export const a2General2: ReadingUnit = {
  id: "de-a2-general-2",
  level: "A2",
  stream: "general",
  title: { en: "Einen Termin vereinbaren", ru: "Договориться о встрече" },
  blurb: {
    en: "Anna und Jonas planen ein Treffen: Modalverben, Zeitangaben und trennbare Verben.",
    ru: "Анна и Йонас планируют встречу: модальные глаголы, выражения времени и отделяемые глаголы.",
  },
  source: {
    en: "Nachrichten zwischen Kollegen (A2)",
    ru: "Сообщения между коллегами (A2)",
  },
  passages: [
    {
      de: "Hallo Jonas! Wir müssen das Projekt besprechen. Hast du diese Woche Zeit? Ich möchte einen Termin mit dir vereinbaren.",
      ru: "Привет, Йонас! Нам нужно обсудить проект. У тебя есть время на этой неделе? Я хочу договориться с тобой о встрече.",
    },
    {
      de: "Hallo Anna! Am Montag kann ich leider nicht, denn ich habe schon ein Meeting. Aber am Dienstag bin ich frei. Passt dir der Nachmittag?",
      ru: "Привет, Анна! В понедельник я, к сожалению, не могу, потому что у меня уже есть встреча. Но во вторник я свободен. Тебе подходит вторая половина дня?",
    },
    {
      de: "Ja, der Dienstag passt mir gut. Sollen wir uns um 15 Uhr treffen? Wir können uns im Café neben dem Büro treffen. Dort ist es ruhig.",
      ru: "Да, вторник мне подходит. Давай встретимся в 15 часов? Мы можем встретиться в кафе рядом с офисом. Там тихо.",
    },
    {
      de: "Super, das klingt gut. Ich bringe meinen Laptop mit und wir schauen uns den Plan zusammen an. Soll ich auch die Zahlen mitbringen?",
      ru: "Отлично, звучит хорошо. Я возьму с собой ноутбук, и мы вместе посмотрим план. Мне взять с собой ещё и цифры?",
    },
    {
      de: "Ja, bitte bring die Zahlen mit. Dann können wir alles in einer Stunde besprechen. Bis Dienstag um 15 Uhr! Ich freue mich darauf.",
      ru: "Да, пожалуйста, возьми цифры. Тогда мы сможем всё обсудить за час. До вторника, в 15 часов! Жду с нетерпением.",
    },
  ],
  phrases: [
    {
      id: "de-a2g2-p1",
      en: "einen Termin vereinbaren",
      ru: "договориться о встрече / назначить встречу",
      note: {
        en: "The standard polite way to arrange an appointment in German.",
        ru: "Стандартный вежливый способ назначить встречу по-немецки.",
      },
    },
    {
      id: "de-a2g2-p2",
      en: "Passt dir der Nachmittag?",
      ru: "Тебе подходит вторая половина дня?",
      note: {
        en: "'passen' + dative (dir/Ihnen) asks if a time suits someone.",
        ru: "'passen' + дательный падеж (dir/Ihnen) спрашивает, удобно ли кому-то время.",
      },
    },
    {
      id: "de-a2g2-p3",
      en: "Ich bringe meinen Laptop mit.",
      ru: "Я возьму с собой ноутбук.",
      note: {
        en: "'mitbringen' is a separable verb; 'mit' goes to the end of the clause.",
        ru: "'mitbringen' — отделяемый глагол; приставка 'mit' уходит в конец предложения.",
      },
    },
    {
      id: "de-a2g2-p4",
      en: "Ich freue mich darauf.",
      ru: "Жду с нетерпением. / Рад этому.",
      note: {
        en: "'sich auf etwas freuen' = to look forward to something.",
        ru: "'sich auf etwas freuen' = с нетерпением ждать чего-то.",
      },
    },
  ],
  questions: [
    {
      id: "de-a2g2-q1",
      q: { en: "Warum kann Jonas am Montag nicht?", ru: "Почему Йонас не может в понедельник?" },
      options: [
        { en: "Er ist krank.", ru: "Он болен." },
        { en: "Er hat schon ein Meeting.", ru: "У него уже есть встреча." },
        { en: "Er ist im Urlaub.", ru: "Он в отпуске." },
      ],
      answer: 1,
      explain: {
        en: "He writes 'Am Montag kann ich leider nicht, denn ich habe schon ein Meeting.'",
        ru: "Он пишет «Am Montag kann ich leider nicht, denn ich habe schon ein Meeting».",
      },
    },
    {
      id: "de-a2g2-q2",
      q: { en: "Wann und wo treffen sich Anna und Jonas?", ru: "Когда и где встречаются Анна и Йонас?" },
      options: [
        { en: "Am Montag im Büro", ru: "В понедельник в офисе" },
        { en: "Am Dienstag um 15 Uhr im Café", ru: "Во вторник в 15 часов в кафе" },
        { en: "Am Mittwoch um 10 Uhr zu Hause", ru: "В среду в 10 часов дома" },
      ],
      answer: 1,
      explain: {
        en: "They agree on Tuesday at 15:00 in the café next to the office.",
        ru: "Они договариваются на вторник в 15:00 в кафе рядом с офисом.",
      },
    },
    {
      id: "de-a2g2-q3",
      q: { en: "Was soll Jonas mitbringen?", ru: "Что Йонас должен взять с собой?" },
      options: [
        { en: "Die Zahlen", ru: "Цифры" },
        { en: "Das Essen", ru: "Еду" },
        { en: "Einen Stuhl", ru: "Стул" },
      ],
      answer: 0,
      explain: {
        en: "Anna writes 'Ja, bitte bring die Zahlen mit.'",
        ru: "Анна пишет «Ja, bitte bring die Zahlen mit» (Да, пожалуйста, возьми цифры).",
      },
    },
  ],
  targetWords: ["vereinbaren", "der Termin", "passen", "mitbringen", "besprechen", "sich freuen"],
};
