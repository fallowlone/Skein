// site/src/german/data/reading/b1-engineering.ts
// B1 engineering-stream reading text. Real dev German with Russian translations.
// Passage uses { de, ru }. Phrase/Question mirror the English Bi shape.
import type { ReadingUnit } from "~/german/types";

export const b1Engineering: ReadingUnit = {
  id: "de-b1-engineering",
  level: "B1",
  stream: "engineering",
  title: { en: "Ein Deployment-Runbook", ru: "Раннбук для деплоя" },
  blurb: {
    en: "Ein Auszug aus einem Runbook: wie man ein neues Release ausrollt und was bei Problemen zu tun ist.",
    ru: "Фрагмент раннбука: как выкатить новый релиз и что делать при проблемах.",
  },
  source: {
    en: "Internes Deployment-Runbook (B1)",
    ru: "Внутренний раннбук для деплоя (B1)",
  },
  passages: [
    {
      de: "Bevor du mit dem Deployment beginnst, stelle sicher, dass alle Tests in der Pipeline erfolgreich durchgelaufen sind. Prüfe außerdem, ob es offene kritische Fehler gibt. Falls ja, verschiebe das Release und informiere das Team im Chat.",
      ru: "Прежде чем начать деплой, убедись, что все тесты в пайплайне прошли успешно. Кроме того, проверь, нет ли открытых критических ошибок. Если есть, перенеси релиз и сообщи команде в чате.",
    },
    {
      de: "Starte das Deployment zuerst auf der Staging-Umgebung. Beobachte die Logs und die Metriken etwa zehn Minuten lang. Achte besonders auf die Fehlerrate und die Antwortzeiten. Erst wenn alles stabil aussieht, rollst du auf Produktion aus.",
      ru: "Сначала запусти деплой на стейджинг-окружении. Понаблюдай за логами и метриками примерно десять минут. Особенно следи за частотой ошибок и временем ответа. Только когда всё выглядит стабильно, выкатывай на продакшн.",
    },
    {
      de: "Wir benutzen ein schrittweises Rollout: Zuerst bekommen nur fünf Prozent der Nutzer die neue Version. Steigt die Fehlerrate nicht an, erhöhen wir den Anteil langsam auf hundert Prozent. So begrenzen wir den Schaden, falls etwas schiefgeht.",
      ru: "Мы используем поэтапную раскатку: сначала новую версию получают только пять процентов пользователей. Если частота ошибок не растёт, мы медленно увеличиваем долю до ста процентов. Так мы ограничиваем ущерб, если что-то пойдёт не так.",
    },
    {
      de: "Wenn nach dem Deployment Probleme auftreten, mache sofort einen Rollback auf die vorherige Version. Dokumentiere danach, was passiert ist, und erstelle ein Ticket. Eine ruhige, klare Kommunikation ist in einem Incident wichtiger als Schnelligkeit.",
      ru: "Если после деплоя возникают проблемы, немедленно сделай откат к предыдущей версии. После этого задокументируй, что произошло, и создай тикет. Во время инцидента спокойная и чёткая коммуникация важнее скорости.",
    },
  ],
  phrases: [
    {
      id: "de-b1e-p1",
      en: "Stelle sicher, dass …",
      ru: "Убедись, что …",
      note: {
        en: "'sicherstellen' = to make sure/ensure; common in runbooks and checklists.",
        ru: "'sicherstellen' = убедиться/обеспечить; часто в раннбуках и чек-листах.",
      },
    },
    {
      id: "de-b1e-p2",
      en: "auf Produktion ausrollen",
      ru: "выкатить на продакшн",
      note: {
        en: "'ausrollen' (to roll out) is the standard verb for deploying a release.",
        ru: "'ausrollen' (раскатать) — стандартный глагол для деплоя релиза.",
      },
    },
    {
      id: "de-b1e-p3",
      en: "einen Rollback machen",
      ru: "сделать откат (rollback)",
      note: {
        en: "German keeps the English noun 'Rollback'; the verb is 'machen' or 'durchführen'.",
        ru: "В немецком сохраняется английское 'Rollback'; глагол — 'machen' или 'durchführen'.",
      },
    },
    {
      id: "de-b1e-p4",
      en: "falls etwas schiefgeht",
      ru: "если что-то пойдёт не так",
      note: {
        en: "'schiefgehen' = to go wrong; a very natural way to talk about failures.",
        ru: "'schiefgehen' = пойти не так; очень естественный способ говорить о сбоях.",
      },
    },
  ],
  questions: [
    {
      id: "de-b1e-q1",
      q: { en: "Was muss man vor dem Deployment prüfen?", ru: "Что нужно проверить перед деплоем?" },
      options: [
        { en: "Ob alle Tests grün sind und keine kritischen Fehler offen sind", ru: "Все ли тесты зелёные и нет ли открытых критических ошибок" },
        { en: "Ob das Wetter gut ist", ru: "Хорошая ли погода" },
        { en: "Ob der Chef im Büro ist", ru: "В офисе ли начальник" },
      ],
      answer: 0,
      explain: {
        en: "The first passage says to ensure all tests passed and there are no open critical bugs.",
        ru: "Первый абзац говорит убедиться, что все тесты прошли и нет открытых критических багов.",
      },
    },
    {
      id: "de-b1e-q2",
      q: { en: "Warum wird zuerst nur fünf Prozent der Nutzer ausgerollt?", ru: "Почему сначала раскатывают только на пять процентов пользователей?" },
      options: [
        { en: "Weil der Server nur fünf Prozent verträgt", ru: "Потому что сервер выдерживает только пять процентов" },
        { en: "Um den Schaden zu begrenzen, falls etwas schiefgeht", ru: "Чтобы ограничить ущерб, если что-то пойдёт не так" },
        { en: "Weil es so vorgeschrieben ist", ru: "Потому что так предписано" },
      ],
      answer: 1,
      explain: {
        en: "The third passage explains the staged rollout limits damage if something goes wrong.",
        ru: "Третий абзац объясняет, что поэтапная раскатка ограничивает ущерб при сбое.",
      },
    },
    {
      id: "de-b1e-q3",
      q: { en: "Was soll man tun, wenn nach dem Deployment Probleme auftreten?", ru: "Что делать, если после деплоя возникают проблемы?" },
      options: [
        { en: "Den Computer ausschalten", ru: "Выключить компьютер" },
        { en: "Warten, bis es von selbst besser wird", ru: "Ждать, пока само наладится" },
        { en: "Sofort einen Rollback machen und dokumentieren", ru: "Немедленно сделать откат и задокументировать" },
      ],
      answer: 2,
      explain: {
        en: "The last passage says to roll back immediately and then document and create a ticket.",
        ru: "Последний абзац говорит немедленно откатиться, затем задокументировать и создать тикет.",
      },
    },
  ],
  targetWords: ["das Deployment", "ausrollen", "der Rollback", "die Fehlerrate", "sicherstellen"],
};
