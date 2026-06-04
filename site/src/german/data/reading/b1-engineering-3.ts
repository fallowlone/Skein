// site/src/german/data/reading/b1-engineering-3.ts
// B1 engineering-stream reading text: an RFC / design-doc excerpt proposing a technical change.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape (German lives in `en`).
import type { ReadingUnit } from "~/german/types";

export const b1Engineering3: ReadingUnit = {
  id: "de-b1-engineering-3",
  level: "B1",
  stream: "engineering",
  title: { en: "RFC: Umstieg auf eine Message-Queue", ru: "RFC: переход на очередь сообщений" },
  blurb: {
    en: "Ein Auszug aus einem Design-Dokument — Problem, Vorschlag, Alternativen und Auswirkung, mit Passivkonstruktionen und abwägender Sprache.",
    ru: "Фрагмент проектного документа — проблема, предложение, альтернативы и влияние, с пассивными конструкциями и взвешенным языком.",
  },
  source: {
    en: "Internes Design-Dokument / RFC (B1)",
    ru: "Внутренний проектный документ / RFC (B1)",
  },
  passages: [
    {
      de: "Problem: Derzeit werden E-Mails direkt während der Anfrage versendet. Dadurch wird die Antwortzeit unnötig verlängert, und wenn der E-Mail-Anbieter langsam ist, warten die Nutzer zu lange. Außerdem gehen Nachrichten verloren, falls der Versand fehlschlägt.",
      ru: "Проблема: в настоящее время письма отправляются напрямую во время запроса. Из-за этого время ответа без необходимости увеличивается, и если почтовый провайдер медленный, пользователи ждут слишком долго. Кроме того, сообщения теряются, если отправка завершается неудачей.",
    },
    {
      de: "Vorschlag: Es wird vorgeschlagen, eine Message-Queue einzuführen. Die E-Mails würden nicht mehr sofort verschickt, sondern zuerst in eine Warteschlange gelegt. Ein separater Worker verarbeitet die Aufträge anschließend im Hintergrund, sodass die Anfrage des Nutzers schneller beantwortet wird.",
      ru: "Предложение: предлагается внедрить очередь сообщений. Письма больше не отправлялись бы сразу, а сначала помещались бы в очередь. Отдельный воркер затем обрабатывает задания в фоне, так что запрос пользователя обрабатывается быстрее.",
    },
    {
      de: "Alternativen: Eine Möglichkeit wäre, die bestehende Lösung beizubehalten und nur ein längeres Timeout zu setzen. Das ist allerdings keine echte Lösung, da das Grundproblem bestehen bleibt. Eine andere Option wäre ein einfacher Cronjob; dieser ist jedoch weniger zuverlässig und schlechter zu überwachen.",
      ru: "Альтернативы: одним из вариантов было бы сохранить существующее решение и просто установить более длинный таймаут. Однако это не настоящее решение, поскольку основная проблема остаётся. Другим вариантом было бы простое cron-задание; оно, тем не менее, менее надёжно и хуже поддаётся мониторингу.",
    },
    {
      de: "Auswirkung: Durch die Queue wird das System entkoppelt und robuster. Fehlgeschlagene Aufträge können automatisch wiederholt werden, ohne dass der Nutzer etwas merkt. Dennoch steigt die Komplexität, weil eine neue Komponente betrieben und überwacht werden muss.",
      ru: "Влияние: благодаря очереди система становится развязанной и более устойчивой. Неудавшиеся задания могут автоматически повторяться, и пользователь этого не замечает. Тем не менее сложность возрастает, потому что нужно эксплуатировать и контролировать новый компонент.",
    },
    {
      de: "Empfehlung: Insgesamt überwiegen die Vorteile, deshalb wird empfohlen, die Message-Queue schrittweise einzuführen. In einem ersten Schritt sollte nur der E-Mail-Versand umgestellt werden. Weitere Aufgaben können später folgen, sobald wir Erfahrung gesammelt haben.",
      ru: "Рекомендация: в целом преимущества перевешивают, поэтому рекомендуется внедрять очередь сообщений поэтапно. На первом шаге следует перевести только отправку писем. Другие задачи могут последовать позже, как только мы накопим опыт.",
    },
  ],
  phrases: [
    {
      id: "de-b1e3-p1",
      en: "Es wird vorgeschlagen, … einzuführen.",
      ru: "Предлагается внедрить …",
      note: {
        en: "Impersonal passive ('es wird vorgeschlagen') — the neutral register of RFCs and design docs.",
        ru: "Безличный пассив ('es wird vorgeschlagen') — нейтральный регистр RFC и проектных документов.",
      },
    },
    {
      id: "de-b1e3-p2",
      en: "Eine Möglichkeit wäre, …",
      ru: "Одним из вариантов было бы …",
      note: {
        en: "Konjunktiv II ('wäre') signals a hypothetical option when weighing alternatives.",
        ru: "Konjunktiv II ('wäre') обозначает гипотетический вариант при взвешивании альтернатив.",
      },
    },
    {
      id: "de-b1e3-p3",
      en: "Das Grundproblem bleibt bestehen.",
      ru: "Основная проблема остаётся.",
      note: {
        en: "'bestehen bleiben' = to persist/remain; common when rejecting a weak alternative.",
        ru: "'bestehen bleiben' = сохраняться / оставаться; часто при отклонении слабой альтернативы.",
      },
    },
    {
      id: "de-b1e3-p4",
      en: "Insgesamt überwiegen die Vorteile.",
      ru: "В целом преимущества перевешивают.",
      note: {
        en: "'überwiegen' = to outweigh; the classic conclusion of a weighing-up (Abwägung).",
        ru: "'überwiegen' = перевешивать; классический вывод взвешивания (Abwägung).",
      },
    },
  ],
  questions: [
    {
      id: "de-b1e3-q1",
      q: { en: "Was ist das Hauptproblem der jetzigen Lösung?", ru: "В чём главная проблема нынешнего решения?" },
      options: [
        { en: "Die E-Mails sind zu kurz", ru: "Письма слишком короткие" },
        { en: "E-Mails werden während der Anfrage versendet, was die Antwortzeit verlängert", ru: "Письма отправляются во время запроса, что увеличивает время ответа" },
        { en: "Es gibt zu viele Worker", ru: "Слишком много воркеров" },
      ],
      answer: 1,
      explain: {
        en: "The first passage says e-mails are sent during the request, which lengthens response time and can lose messages.",
        ru: "Первый абзац говорит, что письма отправляются во время запроса, что удлиняет время ответа и теряет сообщения.",
      },
    },
    {
      id: "de-b1e3-q2",
      q: { en: "Warum wird die Alternative mit dem längeren Timeout abgelehnt?", ru: "Почему отклоняется альтернатива с более длинным таймаутом?" },
      options: [
        { en: "Weil das Grundproblem bestehen bleibt", ru: "Потому что основная проблема остаётся" },
        { en: "Weil ein Timeout zu teuer ist", ru: "Потому что таймаут слишком дорогой" },
        { en: "Weil niemand das Wort 'Timeout' versteht", ru: "Потому что никто не понимает слово «таймаут»" },
      ],
      answer: 0,
      explain: {
        en: "The third passage says a longer timeout is no real solution because the root problem remains.",
        ru: "Третий абзац говорит, что более длинный таймаут — не настоящее решение, ведь основная проблема остаётся.",
      },
    },
    {
      id: "de-b1e3-q3",
      q: { en: "Welchen Nachteil hat der Vorschlag laut dem Abschnitt 'Auswirkung'?", ru: "Какой недостаток у предложения согласно разделу «Влияние»?" },
      options: [
        { en: "Das System wird langsamer", ru: "Система становится медленнее" },
        { en: "Nutzer bemerken jeden Fehler", ru: "Пользователи замечают каждую ошибку" },
        { en: "Die Komplexität steigt, weil eine neue Komponente betrieben werden muss", ru: "Сложность возрастает, потому что нужно эксплуатировать новый компонент" },
      ],
      answer: 2,
      explain: {
        en: "The fourth passage admits complexity rises because a new component must be run and monitored.",
        ru: "Четвёртый абзац признаёт, что сложность растёт, потому что нужно эксплуатировать и контролировать новый компонент.",
      },
    },
  ],
  targetWords: ["der Vorschlag", "die Warteschlange", "entkoppeln", "die Auswirkung", "überwiegen", "die Alternative"],
};
