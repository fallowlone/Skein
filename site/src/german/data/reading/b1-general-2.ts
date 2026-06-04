// site/src/german/data/reading/b1-general-2.ts
// B1 general-stream reading text: an opinion piece on remote work / work-life balance.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape (German lives in `en`).
import type { ReadingUnit } from "~/german/types";

export const b1General2: ReadingUnit = {
  id: "de-b1-general-2",
  level: "B1",
  stream: "general",
  title: { en: "Homeoffice: Vor- und Nachteile", ru: "Удалёнка: плюсы и минусы" },
  blurb: {
    en: "Ein Meinungsartikel über die Balance zwischen Arbeit und Privatleben — mit Nebensätzen, Konnektoren und Meinungswendungen.",
    ru: "Статья-мнение о балансе между работой и личной жизнью — с придаточными предложениями, союзами и оборотами для выражения мнения.",
  },
  source: {
    en: "Kommentar in einer Wochenzeitung (B1)",
    ru: "Колонка в еженедельной газете (B1)",
  },
  passages: [
    {
      de: "In den letzten Jahren ist das Homeoffice für viele Menschen zur Normalität geworden. Während die einen es loben, weil sie sich ihre Zeit freier einteilen können, klagen die anderen darüber, dass die Grenze zwischen Beruf und Freizeit immer mehr verschwimmt.",
      ru: "За последние годы удалённая работа для многих людей стала нормой. Пока одни хвалят её, потому что могут свободнее распоряжаться своим временем, другие жалуются на то, что граница между работой и отдыхом всё больше стирается.",
    },
    {
      de: "Einerseits spart man durch das Homeoffice viel Zeit, weil das tägliche Pendeln wegfällt. Andererseits fühlen sich manche Kollegen isoliert, da der spontane Austausch in der Küche oder auf dem Flur fehlt. Meiner Meinung nach hängt es stark davon ab, welcher Typ Mensch man ist.",
      ru: "С одной стороны, благодаря удалёнке экономится много времени, потому что отпадает ежедневная дорога. С другой стороны, некоторые коллеги чувствуют себя изолированными, ведь не хватает спонтанного общения на кухне или в коридоре. На мой взгляд, многое зависит от того, какой ты человек.",
    },
    {
      de: "Wer zu Hause produktiver ist, sollte die Möglichkeit nutzen dürfen. Allerdings ist es wichtig, klare Regeln zu vereinbaren, damit niemand rund um die Uhr erreichbar sein muss. Sonst leidet auf Dauer die Gesundheit, und das gute Gefühl der Flexibilität schlägt schnell in Stress um.",
      ru: "Тот, кто продуктивнее дома, должен иметь возможность этим пользоваться. Однако важно договориться о чётких правилах, чтобы никто не обязан был быть на связи круглые сутки. Иначе со временем страдает здоровье, и приятное чувство гибкости быстро превращается в стресс.",
    },
    {
      de: "Viele Unternehmen setzen deshalb auf ein hybrides Modell: An zwei oder drei Tagen kommt man ins Büro, den Rest erledigt man von zu Hause. So bleibt der Kontakt zum Team erhalten, ohne dass man jeden Tag pendeln muss.",
      ru: "Поэтому многие компании делают ставку на гибридную модель: два-три дня приходишь в офис, остальное выполняешь из дома. Так сохраняется контакт с командой, и при этом не нужно ездить каждый день.",
    },
    {
      de: "Zusammenfassend lässt sich sagen, dass es weder eine perfekte noch eine einzige richtige Lösung gibt. Entscheidend ist, dass Arbeitgeber und Beschäftigte ehrlich miteinander reden und eine Balance finden, die für beide Seiten funktioniert.",
      ru: "Подводя итог, можно сказать, что нет ни идеального, ни единственно правильного решения. Решающее значение имеет то, чтобы работодатели и работники честно говорили друг с другом и нашли баланс, который работает для обеих сторон.",
    },
  ],
  phrases: [
    {
      id: "de-b1g2-p1",
      en: "Es hängt davon ab, …",
      ru: "Это зависит от того, …",
      note: {
        en: "Followed by a 'welcher/wie/ob' clause; a flexible way to say 'it depends'.",
        ru: "За этим следует придаточное с 'welcher/wie/ob'; гибкий способ сказать «это зависит».",
      },
    },
    {
      id: "de-b1g2-p2",
      en: "rund um die Uhr erreichbar sein",
      ru: "быть на связи круглые сутки",
      note: {
        en: "'rund um die Uhr' = around the clock; common in work-life-balance debates.",
        ru: "'rund um die Uhr' = круглые сутки; частая фраза в спорах о балансе работы и жизни.",
      },
    },
    {
      id: "de-b1g2-p3",
      en: "in Stress umschlagen",
      ru: "превратиться в стресс",
      note: {
        en: "'umschlagen (in)' = to turn into / flip into; describes a sudden change for the worse.",
        ru: "'umschlagen (in)' = превратиться / резко перейти; описывает внезапное изменение к худшему.",
      },
    },
    {
      id: "de-b1g2-p4",
      en: "Zusammenfassend lässt sich sagen, dass …",
      ru: "Подводя итог, можно сказать, что …",
      note: {
        en: "A formal way to introduce a conclusion; note the verb-final clause after 'dass'.",
        ru: "Формальный способ ввести вывод; обратите внимание на глагол в конце придаточного после 'dass'.",
      },
    },
  ],
  questions: [
    {
      id: "de-b1g2-q1",
      q: { en: "Worüber klagen manche Menschen beim Homeoffice?", ru: "На что некоторые люди жалуются при удалённой работе?" },
      options: [
        { en: "Dass die Grenze zwischen Beruf und Freizeit verschwimmt", ru: "Что граница между работой и отдыхом стирается" },
        { en: "Dass das Internet zu schnell ist", ru: "Что интернет слишком быстрый" },
        { en: "Dass sie zu wenig Arbeit haben", ru: "Что у них слишком мало работы" },
      ],
      answer: 0,
      explain: {
        en: "The first passage names the blurring line between work and leisure as the main complaint.",
        ru: "Первый абзац называет стирание границы между работой и отдыхом главной жалобой.",
      },
    },
    {
      id: "de-b1g2-q2",
      q: { en: "Warum sind klare Regeln laut dem Text wichtig?", ru: "Почему, согласно тексту, важны чёткие правила?" },
      options: [
        { en: "Damit man mehr Geld verdient", ru: "Чтобы зарабатывать больше денег" },
        { en: "Damit niemand rund um die Uhr erreichbar sein muss und die Gesundheit nicht leidet", ru: "Чтобы никто не был на связи круглые сутки и здоровье не страдало" },
        { en: "Damit man nie ins Büro kommen muss", ru: "Чтобы никогда не приходить в офис" },
      ],
      answer: 1,
      explain: {
        en: "The third passage stresses clear rules so nobody must be reachable around the clock, otherwise health suffers.",
        ru: "Третий абзац подчёркивает чёткие правила, чтобы никто не был на связи круглосуточно, иначе страдает здоровье.",
      },
    },
    {
      id: "de-b1g2-q3",
      q: { en: "Was ist das Fazit des Autors?", ru: "Каков вывод автора?" },
      options: [
        { en: "Homeoffice ist für alle die beste Lösung", ru: "Удалёнка — лучшее решение для всех" },
        { en: "Nur das Büro funktioniert wirklich", ru: "По-настоящему работает только офис" },
        { en: "Es gibt keine perfekte Lösung; man muss gemeinsam eine Balance finden", ru: "Идеального решения нет; нужно вместе найти баланс" },
      ],
      answer: 2,
      explain: {
        en: "The last passage says there is no perfect or single right solution and that both sides must find a balance.",
        ru: "Последний абзац говорит, что нет идеального или единственно верного решения и обе стороны должны найти баланс.",
      },
    },
  ],
  targetWords: ["das Homeoffice", "pendeln", "verschwimmen", "erreichbar", "hybrid", "die Balance"],
};
