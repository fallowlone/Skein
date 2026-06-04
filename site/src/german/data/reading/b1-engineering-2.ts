// site/src/german/data/reading/b1-engineering-2.ts
// B1 engineering-stream reading text: a production incident postmortem summary.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape (German lives in `en`).
import type { ReadingUnit } from "~/german/types";

export const b1Engineering2: ReadingUnit = {
  id: "de-b1-engineering-2",
  level: "B1",
  stream: "engineering",
  title: { en: "Postmortem: Ausfall des Zahlungsdienstes", ru: "Постмортем: сбой платёжного сервиса" },
  blurb: {
    en: "Eine Zusammenfassung eines Postmortems — Störung, Ursache, Behebung und Maßnahmen, in professionellem Engineering-Deutsch.",
    ru: "Краткое содержание постмортема — сбой, причина, устранение и меры, на профессиональном инженерном немецком.",
  },
  source: {
    en: "Internes Postmortem-Dokument (B1)",
    ru: "Внутренний документ постмортема (B1)",
  },
  passages: [
    {
      de: "Am 3. Juni kam es zwischen 14:12 und 14:47 Uhr zu einer Störung im Zahlungsdienst. In diesem Zeitraum schlugen rund vierzig Prozent aller Transaktionen fehl. Betroffen waren vor allem Kunden, die mit Kreditkarte bezahlen wollten.",
      ru: "3 июня в период с 14:12 до 14:47 произошёл сбой в платёжном сервисе. В этот промежуток времени около сорока процентов всех транзакций завершались неудачей. Затронуты были прежде всего клиенты, которые хотели оплатить кредитной картой.",
    },
    {
      de: "Die Ursache war eine fehlerhafte Konfiguration, die mit dem letzten Deployment ausgerollt wurde. Durch einen Tippfehler in einer Umgebungsvariablen konnte der Dienst die Verbindung zur Datenbank nicht aufbauen. Dadurch lief der Verbindungspool voll, und neue Anfragen wurden abgelehnt.",
      ru: "Причиной была ошибочная конфигурация, которая была выкачена с последним деплоем. Из-за опечатки в переменной окружения сервис не смог установить соединение с базой данных. В результате пул соединений переполнился, и новые запросы отклонялись.",
    },
    {
      de: "Das Problem wurde durch eine Alarmmeldung erkannt, weil die Fehlerrate plötzlich stark anstieg. Der diensthabende Entwickler hat das fehlerhafte Release sofort zurückgerollt. Nach dem Rollback normalisierte sich die Lage innerhalb weniger Minuten.",
      ru: "Проблема была обнаружена через оповещение, потому что частота ошибок внезапно резко выросла. Дежурный разработчик немедленно откатил неисправный релиз. После отката ситуация нормализовалась в течение нескольких минут.",
    },
    {
      de: "Insgesamt dauerte der Ausfall 35 Minuten. Es gingen keine Daten verloren, da fehlgeschlagene Zahlungen nicht abgebucht wurden. Trotzdem war der Vorfall für die Kunden ärgerlich, und einige Bestellungen mussten später manuell nachbearbeitet werden.",
      ru: "В общей сложности сбой длился 35 минут. Данные не были потеряны, так как неудавшиеся платежи не списывались. Тем не менее инцидент был неприятен для клиентов, и некоторые заказы пришлось позже обработать вручную.",
    },
    {
      de: "Als Maßnahmen haben wir Folgendes beschlossen: Erstens werden Konfigurationsänderungen künftig automatisch validiert. Zweitens richten wir einen zusätzlichen Alarm für den Verbindungspool ein. Drittens üben wir den Rollback-Prozess regelmäßig, damit er im Ernstfall noch schneller abläuft.",
      ru: "В качестве мер мы решили следующее: во-первых, изменения конфигурации впредь будут проверяться автоматически. Во-вторых, мы настроим дополнительное оповещение для пула соединений. В-третьих, мы будем регулярно отрабатывать процесс отката, чтобы в критической ситуации он проходил ещё быстрее.",
    },
  ],
  phrases: [
    {
      id: "de-b1e2-p1",
      en: "Es kam zu einer Störung.",
      ru: "Произошёл сбой.",
      note: {
        en: "'Es kommt zu …' is the standard impersonal construction for an incident occurring.",
        ru: "'Es kommt zu …' — стандартная безличная конструкция для возникновения инцидента.",
      },
    },
    {
      id: "de-b1e2-p2",
      en: "Die Ursache war …",
      ru: "Причиной было …",
      note: {
        en: "'die Ursache' = root cause; the core sentence of every postmortem's analysis.",
        ru: "'die Ursache' = первопричина; ключевое предложение в анализе любого постмортема.",
      },
    },
    {
      id: "de-b1e2-p3",
      en: "ein Release zurückrollen",
      ru: "откатить релиз",
      note: {
        en: "'zurückrollen' is a separable verb: 'er rollt das Release zurück'.",
        ru: "'zurückrollen' — отделяемый глагол: 'er rollt das Release zurück'.",
      },
    },
    {
      id: "de-b1e2-p4",
      en: "Als Maßnahmen haben wir beschlossen, …",
      ru: "В качестве мер мы решили …",
      note: {
        en: "'die Maßnahme' = measure/action item; introduces the follow-up actions section.",
        ru: "'die Maßnahme' = мера / план действий; вводит раздел последующих действий.",
      },
    },
  ],
  questions: [
    {
      id: "de-b1e2-q1",
      q: { en: "Was war die Ursache des Ausfalls?", ru: "Какова была причина сбоя?" },
      options: [
        { en: "Ein Stromausfall im Rechenzentrum", ru: "Отключение электричества в дата-центре" },
        { en: "Ein Tippfehler in einer Umgebungsvariablen, der die Datenbankverbindung verhinderte", ru: "Опечатка в переменной окружения, помешавшая соединению с базой данных" },
        { en: "Ein Angriff von außen", ru: "Внешняя атака" },
      ],
      answer: 1,
      explain: {
        en: "The second passage names a typo in an environment variable that broke the database connection.",
        ru: "Второй абзац называет опечатку в переменной окружения, нарушившую соединение с базой данных.",
      },
    },
    {
      id: "de-b1e2-q2",
      q: { en: "Wie wurde das Problem behoben?", ru: "Как была устранена проблема?" },
      options: [
        { en: "Durch einen sofortigen Rollback des fehlerhaften Releases", ru: "Немедленным откатом неисправного релиза" },
        { en: "Durch einen Neustart aller Computer im Büro", ru: "Перезагрузкой всех компьютеров в офисе" },
        { en: "Indem man bis zum nächsten Tag wartete", ru: "Ожиданием до следующего дня" },
      ],
      answer: 0,
      explain: {
        en: "The third passage says the on-call developer rolled back the faulty release immediately.",
        ru: "Третий абзац говорит, что дежурный разработчик немедленно откатил неисправный релиз.",
      },
    },
    {
      id: "de-b1e2-q3",
      q: { en: "Welche Maßnahme wurde NICHT beschlossen?", ru: "Какая мера НЕ была принята?" },
      options: [
        { en: "Konfigurationsänderungen automatisch validieren", ru: "Автоматически проверять изменения конфигурации" },
        { en: "Einen zusätzlichen Alarm für den Verbindungspool einrichten", ru: "Настроить дополнительное оповещение для пула соединений" },
        { en: "Den Zahlungsdienst komplett abschalten", ru: "Полностью отключить платёжный сервис" },
      ],
      answer: 2,
      explain: {
        en: "The last passage lists validation, an extra alarm and rollback practice — not shutting the service down.",
        ru: "Последний абзац перечисляет валидацию, дополнительное оповещение и отработку отката — а не отключение сервиса.",
      },
    },
  ],
  targetWords: ["die Störung", "der Ausfall", "die Ursache", "beheben", "die Maßnahme", "zurückrollen"],
};
