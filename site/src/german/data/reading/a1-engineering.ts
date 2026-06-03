// site/src/german/data/reading/a1-engineering.ts
// A1 engineering-stream reading text. Simple dev German with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape.
import type { ReadingUnit } from "~/german/types";

export const a1Engineering: ReadingUnit = {
  id: "de-a1-engineering",
  level: "A1",
  stream: "engineering",
  title: { en: "Mein erster Tag im Team", ru: "Мой первый день в команде" },
  blurb: {
    en: "Sehr einfache Sätze aus dem Entwickler-Alltag: Computer, Code, Team und Hilfe.",
    ru: "Очень простые предложения из будней разработчика: компьютер, код, команда и помощь.",
  },
  source: {
    en: "Kurze Chat-Nachrichten im Team (A1) — short team chat",
    ru: "Короткие сообщения в командном чате (A1)",
  },
  passages: [
    {
      de: "Hallo Team! Ich bin neu hier. Ich bin Entwicklerin. Ich schreibe Code. Ich freue mich auf die Arbeit.",
      ru: "Привет, команда! Я здесь новенькая. Я разработчица. Я пишу код. Я рада работе.",
    },
    {
      de: "Heute lerne ich das Projekt. Ich öffne den Computer. Ich starte das Programm. Alles ist neu für mich.",
      ru: "Сегодня я изучаю проект. Я включаю компьютер. Я запускаю программу. Всё для меня новое.",
    },
    {
      de: "Ich habe eine Frage. Wo ist der Code? Mein Kollege hilft mir. Er sagt: „Der Code ist hier.“",
      ru: "У меня есть вопрос. Где код? Мой коллега помогает мне. Он говорит: «Код здесь».",
    },
    {
      de: "Jetzt funktioniert alles. Das Programm läuft. Ich bin glücklich. Danke, Team!",
      ru: "Теперь всё работает. Программа запускается. Я счастлива. Спасибо, команда!",
    },
  ],
  phrases: [
    {
      id: "de-a1e-p1",
      en: "Ich bin neu hier.",
      ru: "Я здесь новенький / новенькая.",
      note: {
        en: "A simple way to introduce yourself on a new team.",
        ru: "Простой способ представиться в новой команде.",
      },
    },
    {
      id: "de-a1e-p2",
      en: "Ich habe eine Frage.",
      ru: "У меня есть вопрос.",
      note: {
        en: "Use this before asking for help.",
        ru: "Используй это перед тем, как попросить о помощи.",
      },
    },
    {
      id: "de-a1e-p3",
      en: "Es funktioniert.",
      ru: "Это работает.",
      note: {
        en: "'funktionieren' = to work (about a machine or program), not 'arbeiten'.",
        ru: "'funktionieren' = работать (о машине или программе), а не 'arbeiten'.",
      },
    },
    {
      id: "de-a1e-p4",
      en: "Das Programm läuft.",
      ru: "Программа запущена / работает.",
      note: {
        en: "'laufen' (literally 'to run') is used for running software, like English.",
        ru: "'laufen' (букв. «бежать») используется для запущенного ПО, как в английском 'run'.",
      },
    },
  ],
  questions: [
    {
      id: "de-a1e-q1",
      q: { en: "Was ist der Beruf von der neuen Person?", ru: "Кто новый человек по профессии?" },
      options: [
        { en: "Designerin", ru: "Дизайнер" },
        { en: "Entwicklerin", ru: "Разработчик" },
        { en: "Managerin", ru: "Менеджер" },
      ],
      answer: 1,
      explain: {
        en: "She says 'Ich bin Entwicklerin.'",
        ru: "Она говорит «Ich bin Entwicklerin» (Я разработчица).",
      },
    },
    {
      id: "de-a1e-q2",
      q: { en: "Wer hilft der neuen Person?", ru: "Кто помогает новому человеку?" },
      options: [
        { en: "Der Chef", ru: "Начальник" },
        { en: "Ein Kollege", ru: "Коллега" },
        { en: "Niemand", ru: "Никто" },
      ],
      answer: 1,
      explain: {
        en: "The text says 'Mein Kollege hilft mir.'",
        ru: "В тексте сказано «Mein Kollege hilft mir» (Мой коллега помогает мне).",
      },
    },
    {
      id: "de-a1e-q3",
      q: { en: "Wie endet der Tag?", ru: "Чем заканчивается день?" },
      options: [
        { en: "Alles funktioniert.", ru: "Всё работает." },
        { en: "Der Computer ist kaputt.", ru: "Компьютер сломан." },
        { en: "Sie geht nach Hause.", ru: "Она идёт домой." },
      ],
      answer: 0,
      explain: {
        en: "She says 'Jetzt funktioniert alles. Das Programm läuft.'",
        ru: "Она говорит «Jetzt funktioniert alles. Das Programm läuft» (Теперь всё работает. Программа запущена).",
      },
    },
  ],
  targetWords: ["der Code", "der Computer", "die Frage", "helfen", "funktionieren"],
};
