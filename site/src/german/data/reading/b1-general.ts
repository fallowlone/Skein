// site/src/german/data/reading/b1-general.ts
// B1 general-stream reading text. German passages with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape.
import type { ReadingUnit } from "~/german/types";

export const b1General: ReadingUnit = {
  id: "de-b1-general",
  level: "B1",
  stream: "general",
  title: { en: "Homeoffice oder Büro?", ru: "Удалёнка или офис?" },
  blurb: {
    en: "Ein Meinungsartikel über die Vor- und Nachteile von Homeoffice — längere Sätze, Konnektoren, Argumente.",
    ru: "Мнение о плюсах и минусах удалённой работы — более длинные предложения, союзы, аргументы.",
  },
  source: {
    en: "Meinungsartikel in einem Online-Magazin (B1)",
    ru: "Колонка-мнение в онлайн-журнале (B1)",
  },
  passages: [
    {
      de: "Seit der Pandemie arbeiten immer mehr Menschen von zu Hause. Viele Angestellte schätzen das Homeoffice, weil sie flexibler sind und keine Zeit mit dem Pendeln verlieren. Andere vermissen jedoch den direkten Kontakt zu ihren Kollegen.",
      ru: "Со времён пандемии всё больше людей работают из дома. Многие сотрудники ценят удалёнку, потому что становятся гибче и не теряют время на дорогу. Другие, однако, скучают по живому общению с коллегами.",
    },
    {
      de: "Ein großer Vorteil ist, dass man sich die Arbeitszeit besser einteilen kann. Wer morgens produktiver ist, beginnt früher; wer abends arbeitet, kann den Tag anders planen. Allerdings fällt es manchen schwer, Arbeit und Privatleben zu trennen.",
      ru: "Большое преимущество в том, что можно лучше распределять рабочее время. Кто продуктивнее по утрам, начинает раньше; кто работает вечером, планирует день иначе. Тем не менее некоторым трудно отделять работу от личной жизни.",
    },
    {
      de: "Auch für Unternehmen hat das Homeoffice Folgen. Einerseits sparen sie Kosten für Büroräume, andererseits ist es schwieriger, ein Teamgefühl aufzubauen. Deshalb setzen viele Firmen heute auf ein hybrides Modell mit zwei oder drei Bürotagen pro Woche.",
      ru: "Для компаний удалёнка тоже имеет последствия. С одной стороны, они экономят на офисных помещениях, с другой — сложнее формировать командный дух. Поэтому многие фирмы сегодня делают ставку на гибридную модель с двумя-тремя офисными днями в неделю.",
    },
    {
      de: "Meiner Meinung nach gibt es keine perfekte Lösung für alle. Es kommt darauf an, welche Aufgaben man hat und wie man am besten arbeitet. Wichtig ist, dass Arbeitgeber und Mitarbeiter gemeinsam eine faire Regelung finden.",
      ru: "На мой взгляд, идеального решения для всех не существует. Всё зависит от того, какие у тебя задачи и как тебе лучше работается. Важно, чтобы работодатели и сотрудники вместе нашли справедливое решение.",
    },
  ],
  phrases: [
    {
      id: "de-b1g-p1",
      en: "Es kommt darauf an.",
      ru: "Это зависит (от обстоятельств).",
      note: {
        en: "A very common B1 phrase for 'it depends'. Often followed by 'ob' or 'wie'.",
        ru: "Очень частая фраза уровня B1 — «это зависит». Часто за ней следует 'ob' или 'wie'.",
      },
    },
    {
      id: "de-b1g-p2",
      en: "einerseits … andererseits …",
      ru: "с одной стороны … с другой стороны …",
      note: {
        en: "A connector pair used to present two sides of an argument.",
        ru: "Пара союзов для представления двух сторон аргумента.",
      },
    },
    {
      id: "de-b1g-p3",
      en: "Meiner Meinung nach …",
      ru: "На мой взгляд / По моему мнению …",
      note: {
        en: "Introduces your opinion; the verb comes right after (verb-second rule).",
        ru: "Вводит ваше мнение; глагол идёт сразу после (правило «глагол на втором месте»).",
      },
    },
    {
      id: "de-b1g-p4",
      en: "auf etwas setzen",
      ru: "делать ставку на что-то",
      note: {
        en: "Means to rely on or bet on something, e.g. 'auf ein hybrides Modell setzen'.",
        ru: "Означает полагаться на что-то / делать ставку, напр. «auf ein hybrides Modell setzen».",
      },
    },
  ],
  questions: [
    {
      id: "de-b1g-q1",
      q: { en: "Warum schätzen viele Angestellte das Homeoffice?", ru: "Почему многие сотрудники ценят удалёнку?" },
      options: [
        { en: "Weil sie flexibler sind und keine Zeit mit dem Pendeln verlieren", ru: "Потому что они гибче и не теряют время на дорогу" },
        { en: "Weil sie mehr Geld verdienen", ru: "Потому что они больше зарабатывают" },
        { en: "Weil sie nie arbeiten müssen", ru: "Потому что им никогда не приходится работать" },
      ],
      answer: 0,
      explain: {
        en: "The first passage names flexibility and no commuting as the reasons.",
        ru: "В первом абзаце названы гибкость и отсутствие дороги как причины.",
      },
    },
    {
      id: "de-b1g-q2",
      q: { en: "Welchen Nachteil hat das Homeoffice für Unternehmen?", ru: "Какой недостаток удалёнки для компаний?" },
      options: [
        { en: "Sie müssen mehr Büroräume mieten", ru: "Им приходится арендовать больше офисов" },
        { en: "Es ist schwieriger, ein Teamgefühl aufzubauen", ru: "Сложнее формировать командный дух" },
        { en: "Die Mitarbeiter arbeiten zu viel", ru: "Сотрудники работают слишком много" },
      ],
      answer: 1,
      explain: {
        en: "The third passage says it is harder to build a team feeling, even though companies save costs.",
        ru: "В третьем абзаце сказано, что сложнее построить командный дух, хотя компании экономят.",
      },
    },
    {
      id: "de-b1g-q3",
      q: { en: "Was ist die Hauptaussage des Autors am Ende?", ru: "Каков главный вывод автора в конце?" },
      options: [
        { en: "Homeoffice ist immer besser als das Büro", ru: "Удалёнка всегда лучше офиса" },
        { en: "Das Büro ist für alle die beste Lösung", ru: "Офис — лучшее решение для всех" },
        { en: "Es gibt keine perfekte Lösung für alle; man muss eine faire Regelung finden", ru: "Идеального решения для всех нет; нужно найти справедливый вариант" },
      ],
      answer: 2,
      explain: {
        en: "The last passage says there is no perfect solution and stresses a fair arrangement.",
        ru: "Последний абзац говорит, что идеального решения нет, и подчёркивает справедливую договорённость.",
      },
    },
  ],
  targetWords: ["das Homeoffice", "der Vorteil", "der Nachteil", "schätzen", "einteilen"],
};
