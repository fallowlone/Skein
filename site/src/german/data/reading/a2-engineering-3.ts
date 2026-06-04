// site/src/german/data/reading/a2-engineering-3.ts
// A2 engineering-stream reading text: an onboarding / setup README for a new teammate.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape (German lives in `en`).
import type { ReadingUnit } from "~/german/types";

export const a2Engineering3: ReadingUnit = {
  id: "de-a2-engineering-3",
  level: "A2",
  stream: "engineering",
  title: { en: "Setup-Anleitung für neue Kollegen", ru: "Инструкция по настройке для новых коллег" },
  blurb: {
    en: "Ein README mit den ersten Schritten: Repository klonen, Abhängigkeiten installieren, Tests ausführen und den Server starten.",
    ru: "README с первыми шагами: клонировать репозиторий, установить зависимости, запустить тесты и стартовать сервер.",
  },
  source: {
    en: "README im Projekt-Repository (A2)",
    ru: "README в репозитории проекта (A2)",
  },
  passages: [
    {
      de: "Willkommen im Team! Diese Anleitung zeigt dir die ersten Schritte. Lies sie bitte langsam und mach alles der Reihe nach. Wenn etwas nicht klappt, frag einfach im Chat.",
      ru: "Добро пожаловать в команду! Эта инструкция показывает тебе первые шаги. Пожалуйста, прочитай её не спеша и делай всё по порядку. Если что-то не получается, просто спроси в чате.",
    },
    {
      de: "Zuerst musst du das Repository klonen. Öffne das Terminal und gib den Befehl 'git clone' mit der Adresse des Projekts ein. Danach wechselst du mit 'cd' in den neuen Ordner.",
      ru: "Сначала тебе нужно клонировать репозиторий. Открой терминал и введи команду 'git clone' с адресом проекта. Затем перейди с помощью 'cd' в новую папку.",
    },
    {
      de: "Jetzt installierst du die Abhängigkeiten. Führe den Befehl 'npm install' aus. Das kann ein paar Minuten dauern, also hab bitte etwas Geduld. Schließe das Terminal nicht, bis die Installation fertig ist.",
      ru: "Теперь установи зависимости. Выполни команду 'npm install'. Это может занять несколько минут, поэтому, пожалуйста, наберись терпения. Не закрывай терминал, пока установка не завершится.",
    },
    {
      de: "Bevor du den Server startest, solltest du die Tests ausführen. Gib dafür 'npm test' ein. Wenn alle Tests grün sind, ist alles in Ordnung. Wenn ein Test rot ist, melde dich bitte bei deinem Mentor.",
      ru: "Прежде чем запускать сервер, тебе стоит выполнить тесты. Для этого введи 'npm test'. Если все тесты зелёные, всё в порядке. Если какой-то тест красный, пожалуйста, обратись к своему наставнику.",
    },
    {
      de: "Zum Schluss kannst du den Server starten. Tippe 'npm run dev' ein und öffne dann den Browser. Die App läuft jetzt unter 'localhost:3000'. Viel Erfolg und willkommen an Bord!",
      ru: "Наконец, ты можешь запустить сервер. Набери 'npm run dev', а затем открой браузер. Приложение теперь работает по адресу 'localhost:3000'. Удачи и добро пожаловать на борт!",
    },
  ],
  phrases: [
    {
      id: "de-a2e3-p1",
      en: "Mach alles der Reihe nach.",
      ru: "Делай всё по порядку.",
      note: {
        en: "'der Reihe nach' = in order / one after another; useful for step-by-step guides.",
        ru: "'der Reihe nach' = по порядку / одно за другим; удобно для пошаговых инструкций.",
      },
    },
    {
      id: "de-a2e3-p2",
      en: "einen Befehl eingeben",
      ru: "ввести команду",
      note: {
        en: "'eingeben' is a separable verb: 'gib den Befehl ein'.",
        ru: "'eingeben' — отделяемый глагол: 'gib den Befehl ein'.",
      },
    },
    {
      id: "de-a2e3-p3",
      en: "die Abhängigkeiten installieren",
      ru: "установить зависимости",
      note: {
        en: "'die Abhängigkeit' (dependency); plural 'die Abhängigkeiten' for npm packages.",
        ru: "'die Abhängigkeit' (зависимость); множественное 'die Abhängigkeiten' — npm-пакеты.",
      },
    },
    {
      id: "de-a2e3-p4",
      en: "Hab etwas Geduld.",
      ru: "Наберись терпения.",
      note: {
        en: "Imperative of 'haben'; 'Geduld haben' = to be patient.",
        ru: "Повелительное наклонение 'haben'; 'Geduld haben' = быть терпеливым.",
      },
    },
  ],
  questions: [
    {
      id: "de-a2e3-q1",
      q: { en: "Was ist der erste Schritt in der Anleitung?", ru: "Какой первый шаг в инструкции?" },
      options: [
        { en: "Das Repository klonen", ru: "Клонировать репозиторий" },
        { en: "Den Server starten", ru: "Запустить сервер" },
        { en: "Den Browser schließen", ru: "Закрыть браузер" },
      ],
      answer: 0,
      explain: {
        en: "The second passage says you first have to clone the repository with 'git clone'.",
        ru: "Второй абзац говорит, что сначала нужно клонировать репозиторий командой 'git clone'.",
      },
    },
    {
      id: "de-a2e3-q2",
      q: { en: "Was soll man tun, bevor man den Server startet?", ru: "Что нужно сделать, прежде чем запускать сервер?" },
      options: [
        { en: "Den Computer neu starten", ru: "Перезагрузить компьютер" },
        { en: "Die Tests ausführen", ru: "Выполнить тесты" },
        { en: "Eine E-Mail schreiben", ru: "Написать письмо" },
      ],
      answer: 1,
      explain: {
        en: "The fourth passage says to run the tests with 'npm test' before starting the server.",
        ru: "Четвёртый абзац говорит выполнить тесты командой 'npm test' перед запуском сервера.",
      },
    },
    {
      id: "de-a2e3-q3",
      q: { en: "Was soll man tun, wenn ein Test rot ist?", ru: "Что делать, если тест красный?" },
      options: [
        { en: "Den Test löschen", ru: "Удалить тест" },
        { en: "Sich beim Mentor melden", ru: "Обратиться к наставнику" },
        { en: "Den Server trotzdem starten", ru: "Всё равно запустить сервер" },
      ],
      answer: 1,
      explain: {
        en: "The fourth passage says to contact your mentor if a test is red.",
        ru: "Четвёртый абзац говорит обратиться к наставнику, если тест красный.",
      },
    },
  ],
  targetWords: ["klonen", "die Abhängigkeit", "ausführen", "der Befehl", "starten", "die Anleitung"],
};
