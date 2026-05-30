// site/src/english/data/reading/a2-engineering.ts
// A2 engineering-stream reading texts. Bilingual; inline-glossed; targetWords
// reference real vocabA2 ids (ngsl:0001–ngsl:0800).
import type { ReadingUnit } from "~/english/types";

export const a2Engineering: ReadingUnit[] = [
  {
    id: "code-review-101",
    level: "A2",
    stream: "engineering",
    title: {
      en: "Reading a code review",
      ru: "Читаем код-ревью",
    },
    blurb: {
      en: "The first English you meet on a real team: a reviewer's comments on your pull request. Learn to read them without panic.",
      ru: "Первый английский на реальной команде: комментарии ревьюера к твоему pull request. Учимся читать их без паники.",
    },
    source: {
      en: "Pull request review thread",
      ru: "Тред ревью pull request",
    },
    passages: [
      {
        en: "Thanks for the PR! Overall this looks solid, but I left a few comments. Nothing blocking — mostly nits and one thing we should discuss before merging.",
        ru: "Спасибо за PR! В целом выглядит крепко, но я оставил пару комментариев. Ничего блокирующего — в основном мелочи и одна вещь, которую стоит обсудить перед мержем.",
        words: [
          { id: "solid", w: "solid", ru: "надёжный, крепкий", gloss: "good and reliable; not weak", pos: "adj", example: "The design looks solid." },
          { id: "blocking", w: "blocking", ru: "блокирующий (мешает мержу)", gloss: "serious enough to stop the merge", pos: "adj", example: "This bug is blocking the release." },
          { id: "nit", w: "nit", ru: "мелкая придирка", gloss: "a tiny, low-importance comment", pos: "noun", ipa: "nɪt", example: "Just a nit: rename this variable." },
          { id: "merge", w: "merge", ru: "слить ветки (мерж)", gloss: "to join your branch into the main code", pos: "verb", example: "Let's merge after CI passes." },
        ],
      },
      {
        en: "This function is doing too much. Can you split it up? It would be easier to test and reason about if each part had a single responsibility.",
        ru: "Эта функция делает слишком много. Можешь разбить её? Будет легче тестировать и понимать, если у каждой части будет одна ответственность.",
        words: [
          { id: "split-up", w: "split up", ru: "разбить на части", gloss: "to break one thing into smaller parts", pos: "phrase", example: "Split up this big file." },
          { id: "reason-about", w: "reason about", ru: "осмыслить, понять логику", gloss: "to think clearly about how it works", pos: "phrase", example: "Hard to reason about this loop." },
          { id: "responsibility", w: "responsibility", ru: "ответственность, задача", gloss: "the one job a piece of code should do", pos: "noun", ipa: "rɪˌspɒnsɪˈbɪlɪti" },
        ],
      },
      {
        en: "Heads up: this query is not using an index, so it will do a full table scan. On production data that could be slow. Let's add an index or rewrite it.",
        ru: "Имей в виду: этот запрос не использует индекс, поэтому сделает полное сканирование таблицы. На боевых данных это может быть медленно. Давай добавим индекс или перепишем его.",
        words: [
          { id: "heads-up", w: "heads up", ru: "предупреждение, имей в виду", gloss: "a friendly warning about something", pos: "phrase", example: "Heads up: the API changed." },
          { id: "full-table-scan", w: "full table scan", ru: "полное сканирование таблицы", gloss: "the database reads every row, which is slow", pos: "phrase" },
          { id: "production", w: "production", ru: "продакшн, боевая среда", gloss: "the live system real users use", pos: "noun", ipa: "prəˈdʌkʃən" },
        ],
      },
      {
        en: "Nit: typo in the comment — `recieve` should be `receive`. Feel free to ignore if you're in a hurry, but it'd be nice to fix while we're here.",
        ru: "Мелочь: опечатка в комментарии — `recieve` должно быть `receive`. Можешь проигнорировать, если торопишься, но было бы хорошо поправить, раз уж мы здесь.",
        words: [
          { id: "typo", w: "typo", ru: "опечатка", gloss: "a small spelling mistake", pos: "noun", ipa: "ˈtaɪpəʊ" },
          { id: "feel-free", w: "feel free to", ru: "не стесняйся / можешь смело", gloss: "you are allowed to; no pressure", pos: "phrase", example: "Feel free to push back." },
          { id: "in-a-hurry", w: "in a hurry", ru: "в спешке, торопишься", gloss: "needing to do something fast", pos: "phrase" },
        ],
      },
      {
        en: "I'm going to request changes for now, but it's close. Address the comments above and ping me — I'll re-review and approve quickly.",
        ru: "Пока поставлю «запрос изменений», но мы близко. Поправь комментарии выше и пингани меня — я быстро пересмотрю и заапрувлю.",
        words: [
          { id: "request-changes", w: "request changes", ru: "запросить изменения (статус ревью)", gloss: "a review status that asks for edits before merge", pos: "phrase" },
          { id: "address", w: "address", ru: "обработать, разобраться (с комментарием)", gloss: "to deal with or fix something raised", pos: "verb", example: "Please address the failing test." },
          { id: "ping", w: "ping", ru: "пингануть, написать/позвать", gloss: "to send someone a quick message", pos: "verb", example: "Ping me when it's ready." },
          { id: "approve", w: "approve", ru: "одобрить, заапрувить", gloss: "to accept the PR so it can merge", pos: "verb", ipa: "əˈpruːv" },
        ],
      },
    ],
    phrases: [
      { id: "ph-lgtm", en: "LGTM", ru: "«мне ок» (Looks Good To Me)", note: { en: "Said when you approve with no concerns.", ru: "Говорят, когда одобряешь без замечаний." } },
      { id: "ph-wip", en: "WIP", ru: "в работе (Work In Progress)", note: { en: "Marks an unfinished PR not ready for review.", ru: "Помечает незаконченный PR, ещё не готовый к ревью." } },
      { id: "ph-ptal", en: "PTAL", ru: "глянь, пожалуйста (Please Take Another Look)", note: { en: "Asks the reviewer to look again after edits.", ru: "Просит ревьюера посмотреть снова после правок." } },
      { id: "ph-push-back", en: "push back", ru: "возразить, не согласиться", note: { en: "To disagree with feedback — politely. It's normal.", ru: "Не согласиться с фидбеком — вежливо. Это нормально." } },
      { id: "ph-out-of-scope", en: "out of scope", ru: "вне рамок задачи", note: { en: "Not part of this PR's goal — do it later.", ru: "Не входит в цель этого PR — сделать позже." } },
      { id: "ph-good-catch", en: "good catch", ru: "хорошо подметил", note: { en: "Praise when someone spots a real problem.", ru: "Похвала, когда кто-то заметил настоящую проблему." } },
    ],
    questions: [
      {
        id: "q-blocking",
        q: { en: 'The reviewer says the comments are “nothing blocking”. What does that mean for you?', ru: "Ревьюер пишет, что комментарии «nothing blocking». Что это значит для тебя?" },
        options: [
          { en: "You must stop and cannot merge at all.", ru: "Надо остановиться, мержить нельзя совсем." },
          { en: "Nothing here forces you to stop — fix them, then merge.", ru: "Ничто не заставляет остановиться — поправь и мержи." },
          { en: "The reviewer rejected the whole PR.", ru: "Ревьюер отклонил весь PR." },
        ],
        answer: 1,
        explain: { en: '"Blocking" means serious enough to stop the merge. "Nothing blocking" = no hard stoppers.', ru: "«Blocking» = достаточно серьёзно, чтобы остановить мерж. «Nothing blocking» = жёстких стопперов нет." },
      },
      {
        id: "q-index",
        q: { en: "Why is the reviewer worried about the query?", ru: "Почему ревьюер беспокоится из-за запроса?" },
        options: [
          { en: "It has a typo in a comment.", ru: "В комментарии опечатка." },
          { en: "It does a full table scan, which can be slow on production.", ru: "Делает полное сканирование таблицы — на проде может быть медленно." },
          { en: "It does too many things at once.", ru: "Делает слишком много за раз." },
        ],
        answer: 1,
        explain: { en: "No index → the database reads every row (full table scan) → slow on real data.", ru: "Нет индекса → БД читает каждую строку (full table scan) → медленно на реальных данных." },
      },
      {
        id: "q-next",
        q: { en: 'The review status is "request changes". What should you do next?', ru: "Статус ревью — «request changes». Что делать дальше?" },
        options: [
          { en: "Nothing — it will merge by itself.", ru: "Ничего — смержится само." },
          { en: "Open a brand-new PR from scratch.", ru: "Открыть новый PR с нуля." },
          { en: "Address the comments, then ping the reviewer to look again.", ru: "Обработать комментарии и пингануть ревьюера, чтобы глянул снова." },
        ],
        answer: 2,
        explain: { en: '"Request changes" asks for edits before merge. Fix, then ask for re-review (PTAL).', ru: "«Request changes» просит правки до мержа. Поправь и попроси пересмотреть (PTAL)." },
      },
    ],
    targetWords: [
      "ngsl:0730", // review
      "ngsl:0332", // test
      "ngsl:0702", // function
      "ngsl:0713", // production
      "ngsl:0558", // address
      "ngsl:0414", // add
    ],
  },
];
