// site/src/german/data/reading/a2-engineering-2.ts
// A2 engineering-stream reading text. Real dev German with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape
// (German text in the `en`/`q.en`/`options[].en` slots, Russian in `ru`).
import type { ReadingUnit } from "~/german/types";

export const a2Engineering2: ReadingUnit = {
  id: "de-a2-engineering-2",
  level: "A2",
  stream: "engineering",
  title: { en: "Eine neue Funktion und das Review", ru: "Новая функция и ревью" },
  blurb: {
    en: "Eine kurze PR-Beschreibung und ein freundlicher Review-Austausch: Funktion hinzufügen, Test schreiben, Branch zusammenführen.",
    ru: "Краткое описание PR и дружеский обмен ревью: добавить функцию, написать тест, слить ветку.",
  },
  source: {
    en: "Pull-Request und Review-Kommentare auf GitHub (A2)",
    ru: "Pull request и комментарии ревью на GitHub (A2)",
  },
  passages: [
    {
      de: "Titel: Eine Suche hinzufügen. In diesem PR habe ich eine neue Funktion hinzugefügt. Die Nutzer können jetzt nach einem Namen suchen.",
      ru: "Заголовок: добавить поиск. В этом PR я добавил новую функцию. Теперь пользователи могут искать по имени.",
    },
    {
      de: "Ich habe auch einen Test geschrieben. Der Test prüft, ob die Suche richtig funktioniert. Alle Tests laufen grün.",
      ru: "Я также написал тест. Тест проверяет, правильно ли работает поиск. Все тесты проходят (зелёные).",
    },
    {
      de: "Reviewer: Danke für den PR! Der Code sieht gut aus. Kannst du bitte noch einen Kommentar zu der Funktion hinzufügen? Dann ist es leichter zu verstehen.",
      ru: "Ревьюер: Спасибо за PR! Код выглядит хорошо. Можешь, пожалуйста, добавить комментарий к функции? Тогда будет легче понять.",
    },
    {
      de: "Autor: Klar, das mache ich gern. Ich habe den Kommentar gerade hinzugefügt. Kannst du es bitte noch einmal überprüfen?",
      ru: "Автор: Конечно, с удовольствием. Я только что добавил комментарий. Можешь, пожалуйста, проверить ещё раз?",
    },
    {
      de: "Reviewer: Jetzt ist alles klar. Ich genehmige den PR. Du kannst den Branch in main zusammenführen. Gute Arbeit!",
      ru: "Ревьюер: Теперь всё понятно. Я одобряю PR. Ты можешь слить ветку в main. Хорошая работа!",
    },
  ],
  phrases: [
    {
      id: "de-a2e2-p1",
      en: "eine Funktion hinzufügen",
      ru: "добавить функцию",
      note: {
        en: "'hinzufügen' is a separable verb; in the perfect tense it becomes 'hinzugefügt'.",
        ru: "'hinzufügen' — отделяемый глагол; в перфекте становится 'hinzugefügt'.",
      },
    },
    {
      id: "de-a2e2-p2",
      en: "einen Test schreiben",
      ru: "написать тест",
      note: {
        en: "'der Test' is masculine, so 'einen Test' in the accusative.",
        ru: "'der Test' — мужского рода, поэтому 'einen Test' в винительном падеже.",
      },
    },
    {
      id: "de-a2e2-p3",
      en: "Kannst du es bitte überprüfen?",
      ru: "Можешь, пожалуйста, проверить?",
      note: {
        en: "'überprüfen' = to review / check; the modal 'können' sends it to the end.",
        ru: "'überprüfen' = проверять / ревьюить; модальный глагол 'können' отправляет его в конец.",
      },
    },
    {
      id: "de-a2e2-p4",
      en: "den Branch zusammenführen",
      ru: "слить ветку (смержить)",
      note: {
        en: "'zusammenführen' (to merge) is the German term; many devs also just say 'mergen'.",
        ru: "'zusammenführen' (слить) — немецкий термин; многие разработчики говорят просто 'mergen'.",
      },
    },
  ],
  questions: [
    {
      id: "de-a2e2-q1",
      q: { en: "Was hat der Autor in diesem PR gemacht?", ru: "Что автор сделал в этом PR?" },
      options: [
        { en: "Er hat einen Fehler gefunden.", ru: "Он нашёл ошибку." },
        { en: "Er hat eine Suche-Funktion hinzugefügt und einen Test geschrieben.", ru: "Он добавил функцию поиска и написал тест." },
        { en: "Er hat die Datenbank gelöscht.", ru: "Он удалил базу данных." },
      ],
      answer: 1,
      explain: {
        en: "He writes that he added a search function and also wrote a test.",
        ru: "Он пишет, что добавил функцию поиска и также написал тест.",
      },
    },
    {
      id: "de-a2e2-q2",
      q: { en: "Worum bittet der Reviewer zuerst?", ru: "О чём ревьюер просит сначала?" },
      options: [
        { en: "Um einen Kommentar zu der Funktion", ru: "О комментарии к функции" },
        { en: "Um einen neuen Branch", ru: "О новой ветке" },
        { en: "Um eine längere Beschreibung", ru: "О более длинном описании" },
      ],
      answer: 0,
      explain: {
        en: "The reviewer asks 'Kannst du bitte noch einen Kommentar zu der Funktion hinzufügen?'",
        ru: "Ревьюер просит «Kannst du bitte noch einen Kommentar zu der Funktion hinzufügen?».",
      },
    },
    {
      id: "de-a2e2-q3",
      q: { en: "Was kann der Autor am Ende machen?", ru: "Что автор может сделать в конце?" },
      options: [
        { en: "Den PR schließen", ru: "Закрыть PR" },
        { en: "Den Branch in main zusammenführen", ru: "Слить ветку в main" },
        { en: "Den Test löschen", ru: "Удалить тест" },
      ],
      answer: 1,
      explain: {
        en: "The reviewer approves and says 'Du kannst den Branch in main zusammenführen.'",
        ru: "Ревьюер одобряет и говорит «Du kannst den Branch in main zusammenführen».",
      },
    },
  ],
  targetWords: ["hinzufügen", "die Funktion", "der Test", "überprüfen", "zusammenführen", "genehmigen"],
};
