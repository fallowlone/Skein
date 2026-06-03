// site/src/german/data/reading/a2-general.ts
// A2 general-stream reading text. German passages with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape.
import type { ReadingUnit } from "~/german/types";

export const a2General: ReadingUnit = {
  id: "de-a2-general",
  level: "A2",
  stream: "general",
  title: { en: "Eine Wohnung suchen", ru: "Поиск квартиры" },
  blurb: {
    en: "Anna sucht eine Wohnung in Köln und schreibt eine E-Mail an die Vermieterin.",
    ru: "Анна ищет квартиру в Кёльне и пишет письмо арендодательнице.",
  },
  source: {
    en: "E-Mail an eine Vermieterin (A2) — email to a landlord",
    ru: "Письмо арендодательнице (A2)",
  },
  passages: [
    {
      de: "Sehr geehrte Frau Weber, ich habe Ihre Anzeige im Internet gesehen. Die Wohnung in der Bahnhofstraße gefällt mir sehr gut.",
      ru: "Уважаемая госпожа Вебер, я увидела ваше объявление в интернете. Квартира на Банхофштрассе мне очень нравится.",
    },
    {
      de: "Ich suche eine ruhige Wohnung mit zwei Zimmern. Ich arbeite im Zentrum, deshalb ist die Lage für mich perfekt. Wie hoch ist die Miete pro Monat?",
      ru: "Я ищу тихую двухкомнатную квартиру. Я работаю в центре, поэтому расположение для меня идеально. Какова арендная плата в месяц?",
    },
    {
      de: "Ich habe noch ein paar Fragen. Sind Haustiere erlaubt? Ich habe eine kleine Katze. Gibt es einen Balkon? Und ab wann ist die Wohnung frei?",
      ru: "У меня есть ещё несколько вопросов. Разрешены ли домашние животные? У меня есть маленькая кошка. Есть ли балкон? И с какого времени квартира свободна?",
    },
    {
      de: "Ich würde die Wohnung gern besichtigen. Haben Sie diese Woche Zeit? Am Donnerstag oder Freitag passt es mir gut. Vielen Dank im Voraus! Mit freundlichen Grüßen, Anna Schmidt",
      ru: "Я хотела бы посмотреть квартиру. У вас есть время на этой неделе? В четверг или пятницу мне удобно. Заранее большое спасибо! С уважением, Анна Шмидт",
    },
  ],
  phrases: [
    {
      id: "de-a2g-p1",
      en: "Sehr geehrte Frau …",
      ru: "Уважаемая госпожа …",
      note: {
        en: "The formal way to begin a letter or email to a woman you don't know.",
        ru: "Формальное начало письма незнакомой женщине.",
      },
    },
    {
      id: "de-a2g-p2",
      en: "Wie hoch ist die Miete?",
      ru: "Какова арендная плата?",
      note: {
        en: "German asks prices with 'wie hoch' (how high), not 'wie viel'.",
        ru: "По-немецки цену спрашивают через 'wie hoch' (насколько высокая), а не 'wie viel'.",
      },
    },
    {
      id: "de-a2g-p3",
      en: "Ab wann …?",
      ru: "С какого времени …?",
      note: {
        en: "Asks the start date — 'from when is it free?'",
        ru: "Спрашивает дату начала — «с какого момента свободно?»",
      },
    },
    {
      id: "de-a2g-p4",
      en: "Mit freundlichen Grüßen",
      ru: "С уважением",
      note: {
        en: "The standard formal sign-off in German letters and emails.",
        ru: "Стандартная формальная подпись в немецких письмах и письмах.",
      },
    },
  ],
  questions: [
    {
      id: "de-a2g-q1",
      q: { en: "Was für eine Wohnung sucht Anna?", ru: "Какую квартиру ищет Анна?" },
      options: [
        { en: "Eine ruhige Wohnung mit zwei Zimmern", ru: "Тихую двухкомнатную квартиру" },
        { en: "Eine große Wohnung mit Garten", ru: "Большую квартиру с садом" },
        { en: "Ein Zimmer in einer WG", ru: "Комнату в общей квартире" },
      ],
      answer: 0,
      explain: {
        en: "She writes 'Ich suche eine ruhige Wohnung mit zwei Zimmern.'",
        ru: "Она пишет «Ich suche eine ruhige Wohnung mit zwei Zimmern» (тихую двухкомнатную).",
      },
    },
    {
      id: "de-a2g-q2",
      q: { en: "Warum ist die Lage für Anna gut?", ru: "Почему расположение хорошо для Анны?" },
      options: [
        { en: "Weil es dort viele Geschäfte gibt", ru: "Потому что там много магазинов" },
        { en: "Weil sie im Zentrum arbeitet", ru: "Потому что она работает в центре" },
        { en: "Weil ihre Familie dort wohnt", ru: "Потому что там живёт её семья" },
      ],
      answer: 1,
      explain: {
        en: "She says 'Ich arbeite im Zentrum, deshalb ist die Lage für mich perfekt.'",
        ru: "Она говорит «Ich arbeite im Zentrum, deshalb ist die Lage für mich perfekt».",
      },
    },
    {
      id: "de-a2g-q3",
      q: { en: "Wann möchte Anna die Wohnung besichtigen?", ru: "Когда Анна хочет посмотреть квартиру?" },
      options: [
        { en: "Am Montag oder Dienstag", ru: "В понедельник или вторник" },
        { en: "Am Wochenende", ru: "В выходные" },
        { en: "Am Donnerstag oder Freitag", ru: "В четверг или пятницу" },
      ],
      answer: 2,
      explain: {
        en: "She writes 'Am Donnerstag oder Freitag passt es mir gut.'",
        ru: "Она пишет «Am Donnerstag oder Freitag passt es mir gut».",
      },
    },
  ],
  targetWords: ["die Wohnung", "die Miete", "besichtigen", "ruhig", "erlaubt"],
};
