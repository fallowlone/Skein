// site/src/german/data/reading/a2-engineering.ts
// A2 engineering-stream reading text. Real dev German with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape.
import type { ReadingUnit } from "~/german/types";

export const a2Engineering: ReadingUnit = {
  id: "de-a2-engineering",
  level: "A2",
  stream: "engineering",
  title: { en: "Eine Pull-Request-Beschreibung", ru: "Описание пул-реквеста" },
  blurb: {
    en: "Eine einfache PR-Beschreibung: was geändert wurde, warum, und was der Reviewer prüfen soll.",
    ru: "Простое описание PR: что изменено, почему и что должен проверить ревьюер.",
  },
  source: {
    en: "Pull-Request-Beschreibung auf GitHub (A2)",
    ru: "Описание pull request на GitHub (A2)",
  },
  passages: [
    {
      de: "Titel: Login-Fehler auf dem Handy beheben. Dieser PR behebt einen Fehler. Der Button auf der Login-Seite hat auf dem Handy nicht funktioniert.",
      ru: "Заголовок: исправить ошибку входа на телефоне. Этот PR исправляет ошибку. Кнопка на странице входа не работала на телефоне.",
    },
    {
      de: "Was habe ich gemacht? Ich habe das CSS geändert. Jetzt ist der Button groß genug. Man kann ihn auf jedem Bildschirm gut drücken.",
      ru: "Что я сделал? Я изменил CSS. Теперь кнопка достаточно большая. На неё можно удобно нажать на любом экране.",
    },
    {
      de: "Warum? Viele Nutzer benutzen die App auf dem Handy. Der Fehler war wichtig, denn die Nutzer konnten sich nicht anmelden.",
      ru: "Почему? Многие пользователи пользуются приложением на телефоне. Ошибка была важной, потому что пользователи не могли войти.",
    },
    {
      de: "Wie kann man es testen? Bitte öffne die Login-Seite auf dem Handy und drücke den Button. Die Tests laufen schon grün. Bitte schau es dir an und gib mir Bescheid.",
      ru: "Как это протестировать? Пожалуйста, открой страницу входа на телефоне и нажми кнопку. Тесты уже проходят (зелёные). Пожалуйста, посмотри и дай мне знать.",
    },
  ],
  phrases: [
    {
      id: "de-a2e-p1",
      en: "einen Fehler beheben",
      ru: "исправить ошибку / баг",
      note: {
        en: "'beheben' is the standard verb for fixing a bug in German dev speak.",
        ru: "'beheben' — стандартный глагол для исправления бага в немецком IT-жаргоне.",
      },
    },
    {
      id: "de-a2e-p2",
      en: "Die Tests laufen grün.",
      ru: "Тесты проходят (зелёные).",
      note: {
        en: "'grün' (green) means the CI tests pass, just like in English.",
        ru: "'grün' (зелёный) значит, что тесты в CI проходят, как и в английском.",
      },
    },
    {
      id: "de-a2e-p3",
      en: "Gib mir Bescheid.",
      ru: "Дай мне знать.",
      note: {
        en: "A common, slightly informal way to ask for a reply or confirmation.",
        ru: "Распространённый, чуть неформальный способ попросить ответ или подтверждение.",
      },
    },
    {
      id: "de-a2e-p4",
      en: "Schau es dir an.",
      ru: "Посмотри (взгляни) на это.",
      note: {
        en: "'sich etwas ansehen' = to take a look at something; used for review requests.",
        ru: "'sich etwas ansehen' = взглянуть на что-то; используется в просьбах о ревью.",
      },
    },
  ],
  questions: [
    {
      id: "de-a2e-q1",
      q: { en: "Welches Problem behebt dieser PR?", ru: "Какую проблему исправляет этот PR?" },
      options: [
        { en: "Der Login-Button funktionierte auf dem Handy nicht.", ru: "Кнопка входа не работала на телефоне." },
        { en: "Die Datenbank war zu langsam.", ru: "База данных была слишком медленной." },
        { en: "Die Seite hatte einen Tippfehler.", ru: "На странице была опечатка." },
      ],
      answer: 0,
      explain: {
        en: "The title and first passage say the login button did not work on mobile.",
        ru: "Заголовок и первый абзац говорят, что кнопка входа не работала на телефоне.",
      },
    },
    {
      id: "de-a2e-q2",
      q: { en: "Was hat der Entwickler geändert?", ru: "Что изменил разработчик?" },
      options: [
        { en: "Die Datenbank", ru: "Базу данных" },
        { en: "Das CSS, damit der Button größer ist", ru: "CSS, чтобы кнопка стала больше" },
        { en: "Den Servernamen", ru: "Имя сервера" },
      ],
      answer: 1,
      explain: {
        en: "He writes 'Ich habe das CSS geändert. Jetzt ist der Button groß genug.'",
        ru: "Он пишет «Ich habe das CSS geändert. Jetzt ist der Button groß genug».",
      },
    },
    {
      id: "de-a2e-q3",
      q: { en: "Wie soll der Reviewer den Fix testen?", ru: "Как ревьюеру протестировать исправление?" },
      options: [
        { en: "Den Server neu starten", ru: "Перезапустить сервер" },
        { en: "Die Login-Seite auf dem Handy öffnen und den Button drücken", ru: "Открыть страницу входа на телефоне и нажать кнопку" },
        { en: "Die Datenbank prüfen", ru: "Проверить базу данных" },
      ],
      answer: 1,
      explain: {
        en: "The last passage asks the reviewer to open the login page on mobile and press the button.",
        ru: "Последний абзац просит ревьюера открыть страницу входа на телефоне и нажать кнопку.",
      },
    },
  ],
  targetWords: ["beheben", "der Fehler", "ändern", "testen", "anmelden"],
};
