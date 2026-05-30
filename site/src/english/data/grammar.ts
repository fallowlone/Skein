// site/src/english/data/grammar.ts
// Grammar-in-context micro-lessons (B1/B2) with bilingual scaffolding + cloze.
import type { GrammarPoint } from "~/english/types";

export const grammarPoints: GrammarPoint[] = [
  {
    id: "grammar:present-perfect-vs-past",
    band: "B1",
    domain: "engineering",
    title: { en: "Present Perfect vs Past Simple", ru: "Present Perfect vs Past Simple" },
    structure: {
      en: "have/has + past participle  vs  verb-ed / irregular past",
      ru: "have/has + причастие прошедшего времени  vs  прошедшее время",
    },
    explain: {
      en: "Use present perfect when the past action has a connection to now (result matters, time unspecified). Use past simple when the action is finished and the time is named or clearly in the past.",
      ru: "Present Perfect — когда прошлое действие связано с настоящим (результат важен, время не уточняется). Past Simple — когда действие завершено и указано конкретное время.",
    },
    examples: [
      {
        en: "I have merged the pull request — the branch is gone now.",
        ru: "Я слил пул-реквест — ветки больше нет.",
        note: { en: "result visible now → present perfect", ru: "результат виден сейчас → present perfect" },
      },
      {
        en: "We deployed the hotfix at 03:14 UTC and the error rate dropped immediately.",
        ru: "Мы задеплоили хотфикс в 03:14 UTC, и частота ошибок сразу упала.",
        note: { en: "specific past time → past simple", ru: "конкретное прошедшее время → past simple" },
      },
      {
        en: "Has anyone reviewed this RFC yet? — Yes, Alice reviewed it yesterday.",
        ru: "Кто-нибудь уже рецензировал этот RFC? — Да, Алиса сделала это вчера.",
      },
    ],
    cloze: [
      {
        id: "grammar:present-perfect-vs-past:1",
        before: "We",
        after: "the CI pipeline twice this sprint, but it still fails occasionally.",
        answer: "have fixed",
        alts: ["fixed"],
        hint: { en: "two repairs, result uncertain — still failing", ru: "два ремонта, результат неоднозначен — всё ещё падает" },
        explain: {
          en: "'have fixed' stresses the repeated attempts whose effect extends to now; 'fixed' would be fine only if a past time marker were present.",
          ru: "'have fixed' подчёркивает повторные попытки, результат которых актуален сейчас; 'fixed' подходит только при указании конкретного времени.",
        },
      },
      {
        id: "grammar:present-perfect-vs-past:2",
        before: "The on-call engineer",
        after: "the incident at 02:30 and escalated to the team.",
        answer: "detected",
        hint: { en: "specific past time (02:30) is given", ru: "указано конкретное прошедшее время (02:30)" },
        explain: {
          en: "The timestamp '02:30' fixes the event in the past → past simple.",
          ru: "Метка времени '02:30' помещает событие в прошлое → Past Simple.",
        },
      },
    ],
  },
  {
    id: "grammar:present-perfect-continuous",
    band: "B2",
    domain: "engineering",
    title: { en: "Present Perfect Continuous", ru: "Present Perfect Continuous" },
    structure: {
      en: "have/has + been + verb-ing",
      ru: "have/has + been + глагол на -ing",
    },
    explain: {
      en: "Emphasises the duration or ongoing nature of an activity that started in the past and continues (or just stopped). Often explains a present situation.",
      ru: "Подчёркивает продолжительность или незавершённость действия, начавшегося в прошлом. Часто объясняет текущую ситуацию.",
    },
    examples: [
      {
        en: "The memory leak has been growing since the last release — heap is now at 94 %.",
        ru: "Утечка памяти растёт с последнего релиза — heap уже на 94 %.",
      },
      {
        en: "I have been refactoring the auth module all week; it should be ready by Friday.",
        ru: "Я рефакторю модуль аутентификации всю неделю; к пятнице должно быть готово.",
      },
    ],
    cloze: [
      {
        id: "grammar:present-perfect-continuous:1",
        before: "The team",
        after: "on the migration for three months and the end is finally in sight.",
        answer: "has been working",
        hint: { en: "ongoing activity with duration 'for three months'", ru: "продолжающееся действие с указанием длительности 'for three months'" },
        explain: {
          en: "Duration phrase 'for three months' + ongoing activity → present perfect continuous.",
          ru: "Фраза длительности 'for three months' + незавершённое действие → present perfect continuous.",
        },
      },
      {
        id: "grammar:present-perfect-continuous:2",
        before: "CPU usage",
        after: "steadily since we enabled the new feature flag.",
        answer: "has been rising",
        hint: { en: "gradual ongoing change starting at a past point", ru: "постепенное продолжающееся изменение, начавшееся в прошлом" },
      },
    ],
  },
  {
    id: "grammar:conditional-type0",
    band: "B1",
    title: { en: "Conditional Type 0 — Universal Truth", ru: "Условное предложение 0-го типа — всеобщая истина" },
    structure: {
      en: "if + present simple, present simple",
      ru: "if + настоящее простое, настоящее простое",
    },
    explain: {
      en: "Describes facts, laws, or automatic processes — things that are always true whenever the condition is met.",
      ru: "Описывает факты, законы или автоматические процессы — то, что всегда истинно при выполнении условия.",
    },
    examples: [
      {
        en: "If you divide by zero, the program throws an exception.",
        ru: "Если делить на ноль, программа выбрасывает исключение.",
      },
      {
        en: "If the cache misses, the system fetches data from the database.",
        ru: "Если кэш не срабатывает, система запрашивает данные из базы.",
      },
    ],
    cloze: [
      {
        id: "grammar:conditional-type0:1",
        before: "If a transaction",
        after: ", the database rolls back all changes.",
        answer: "fails",
        hint: { en: "universal database rule — use present simple in both clauses", ru: "универсальное правило базы данных — настоящее время в обоих предложениях" },
      },
      {
        id: "grammar:conditional-type0:2",
        before: "You",
        after: "a race condition if two threads write to shared memory without a lock.",
        answer: "get",
        hint: { en: "general technical truth — type 0", ru: "общая техническая истина — тип 0" },
      },
    ],
  },
  {
    id: "grammar:conditional-type1",
    band: "B1",
    domain: "engineering",
    title: { en: "Conditional Type 1 — Real / Likely Future", ru: "Условное предложение 1-го типа — реальное / вероятное будущее" },
    structure: {
      en: "if + present simple, will + infinitive",
      ru: "if + настоящее простое, will + инфинитив",
    },
    explain: {
      en: "Describes a real and likely condition and its probable result. Common in planning discussions and ticket acceptance criteria.",
      ru: "Описывает реальное и вероятное условие и его возможный результат. Часто используется при планировании и написании критериев приёмки.",
    },
    examples: [
      {
        en: "If we merge this PR today, the feature will ship in next week's release.",
        ru: "Если мы смержим этот PR сегодня, фича войдёт в следующий релиз.",
      },
      {
        en: "If the load balancer health-check fails, the instance will be removed from rotation.",
        ru: "Если проверка состояния балансировщика нагрузки не пройдёт, инстанс будет исключён из ротации.",
      },
    ],
    cloze: [
      {
        id: "grammar:conditional-type1:1",
        before: "If we add an index on that column, queries",
        after: "much faster.",
        answer: "will run",
        alts: ["will execute"],
        hint: { en: "likely real result — use 'will + verb'", ru: "вероятный реальный результат — используйте 'will + глагол'" },
        explain: {
          en: "Type 1: real probable condition → will + base verb for the result.",
          ru: "Тип 1: реальное вероятное условие → will + инфинитив для результата.",
        },
      },
      {
        id: "grammar:conditional-type1:2",
        before: "If the API rate limit",
        after: "requests, the client will receive a 429 response.",
        answer: "exceeds",
        hint: { en: "present simple in the if-clause", ru: "настоящее время в придаточном условия" },
      },
    ],
  },
  {
    id: "grammar:conditional-type2",
    band: "B1",
    domain: "engineering",
    title: { en: "Conditional Type 2 — Hypothetical Present/Future", ru: "Условное предложение 2-го типа — гипотетическое настоящее/будущее" },
    structure: {
      en: "if + past simple, would + infinitive",
      ru: "if + прошедшее простое, would + инфинитив",
    },
    explain: {
      en: "Describes an imaginary or unlikely situation and its hypothetical result. Used in design discussions: 'If we used GraphQL, we would avoid over-fetching.'",
      ru: "Описывает воображаемую или маловероятную ситуацию. Используется в дискуссиях о дизайне: 'Если бы мы использовали GraphQL, мы бы избежали избыточной загрузки.'",
    },
    examples: [
      {
        en: "If we rewrote the service in Rust, latency would drop significantly.",
        ru: "Если бы мы переписали сервис на Rust, задержка значительно снизилась бы.",
      },
      {
        en: "If I had more context, I would leave a more useful code review.",
        ru: "Если бы у меня было больше контекста, я бы написал более полезный отзыв на код.",
      },
    ],
    cloze: [
      {
        id: "grammar:conditional-type2:1",
        before: "If the monolith",
        after: "into microservices, deployments would be much faster.",
        answer: "were split",
        alts: ["was split"],
        hint: { en: "hypothetical redesign — past simple (or 'were') in if-clause", ru: "гипотетический редизайн — прошедшее время (или 'were') в придаточном" },
        explain: {
          en: "Formal English prefers 'were' over 'was' in type 2 if-clauses, especially in writing.",
          ru: "В формальном английском 'were' предпочтительнее 'was' в придаточных 2-го типа, особенно в письменном тексте.",
        },
      },
      {
        id: "grammar:conditional-type2:2",
        before: "We",
        after: "the bottleneck faster if we had proper tracing in place.",
        answer: "would identify",
        hint: { en: "hypothetical result clause — would + infinitive", ru: "гипотетическое следствие — would + инфинитив" },
      },
    ],
  },
  {
    id: "grammar:conditional-type3",
    band: "B2",
    domain: "engineering",
    title: { en: "Conditional Type 3 — Hypothetical Past", ru: "Условное предложение 3-го типа — гипотетическое прошлое" },
    structure: {
      en: "if + past perfect, would have + past participle",
      ru: "if + прошедшее совершённое, would have + причастие прошедшего времени",
    },
    explain: {
      en: "Describes an imagined different past and its consequence. Common in post-mortems: reflecting on what would have happened if the team had acted differently.",
      ru: "Описывает воображаемое альтернативное прошлое и его последствие. Часто встречается в постмортемах: что было бы, если бы команда поступила иначе.",
    },
    examples: [
      {
        en: "If we had enabled circuit breakers earlier, the cascade failure would not have spread.",
        ru: "Если бы мы раньше включили размыкатели, каскадный сбой не распространился бы.",
      },
      {
        en: "The deployment would have succeeded if the environment variable had been set correctly.",
        ru: "Деплой прошёл бы успешно, если бы переменная окружения была задана правильно.",
      },
    ],
    cloze: [
      {
        id: "grammar:conditional-type3:1",
        before: "If the team",
        after: "the regression tests, the bug would not have reached production.",
        answer: "had run",
        hint: { en: "past failure we regret — past perfect in if-clause", ru: "прошлая ошибка, о которой мы сожалеем — прошедшее совершённое в придаточном" },
        explain: {
          en: "Type 3: real past failure → if + had + pp, would have + pp.",
          ru: "Тип 3: реальная ошибка в прошлом → if + had + pp, would have + pp.",
        },
      },
      {
        id: "grammar:conditional-type3:2",
        before: "We",
        after: "the incident sooner if the alerting threshold had been lower.",
        answer: "would have caught",
        hint: { en: "hypothetical past result — would have + past participle", ru: "гипотетический результат в прошлом — would have + причастие" },
      },
    ],
  },
  {
    id: "grammar:mixed-conditional",
    band: "B2",
    domain: "engineering",
    title: { en: "Mixed Conditionals", ru: "Смешанные условные предложения" },
    structure: {
      en: "if + past perfect (past condition), would + infinitive (present result)  OR  if + past simple (present condition), would have + pp (past result)",
      ru: "if + past perfect (прошлое условие) → would + инфинитив (настоящее следствие)  ИЛИ  if + past simple (настоящее условие) → would have + pp (прошлое следствие)",
    },
    explain: {
      en: "Mix tenses across the if-clause and result clause when the condition and result belong to different times. Engineers use these when past decisions still affect the present state.",
      ru: "Смешивайте времена, когда условие и следствие относятся к разным временны́м планам. Инженеры используют это, когда прошлые решения всё ещё влияют на текущее состояние.",
    },
    examples: [
      {
        en: "If we had chosen a relational database back then, the reporting layer would be much simpler today.",
        ru: "Если бы тогда мы выбрали реляционную базу данных, слой отчётности сегодня был бы намного проще.",
        note: { en: "past choice → present consequence", ru: "прошлый выбор → следствие в настоящем" },
      },
      {
        en: "If the service were stateless, we would not have needed sticky sessions at all.",
        ru: "Если бы сервис был без состояния, нам вообще не потребовались бы залипающие сессии.",
        note: { en: "present state → past consequence", ru: "настоящее состояние → следствие в прошлом" },
      },
    ],
    cloze: [
      {
        id: "grammar:mixed-conditional:1",
        before: "If we had adopted feature flags earlier, releasing new code",
        after: "much safer now.",
        answer: "would be",
        hint: { en: "past decision (had adopted) → present state (would be)", ru: "прошлое решение (had adopted) → состояние сейчас (would be)" },
        explain: {
          en: "Past condition (had adopted) + present result (would be) = type 3→2 mixed conditional.",
          ru: "Прошлое условие (had adopted) + настоящий результат (would be) = смешанный тип 3→2.",
        },
      },
      {
        id: "grammar:mixed-conditional:2",
        before: "If the architecture were event-driven, we",
        after: "that tight coupling problem from the start.",
        answer: "would have avoided",
        hint: { en: "present hypothetical state → past consequence", ru: "гипотетическое настоящее состояние → прошлое следствие" },
      },
    ],
  },
  {
    id: "grammar:defining-relative",
    band: "B1",
    domain: "engineering",
    title: { en: "Defining Relative Clauses", ru: "Определительные придаточные предложения (без запятых)" },
    structure: {
      en: "noun + who/that/which/where + clause (no commas)",
      ru: "существительное + who/that/which/where + придаточное (без запятых)",
    },
    explain: {
      en: "Identifies which specific thing or person is meant. Without the clause the sentence loses meaning. No commas. In tech writing: 'the endpoint that returns paginated results'.",
      ru: "Уточняет, какой именно предмет или человек имеется в виду. Без придаточного смысл предложения теряется. Запятые не ставятся.",
    },
    examples: [
      {
        en: "The function that handles authentication should never log passwords.",
        ru: "Функция, которая обрабатывает аутентификацию, никогда не должна логировать пароли.",
      },
      {
        en: "We rolled back the commit that introduced the memory leak.",
        ru: "Мы откатили коммит, который вызвал утечку памяти.",
      },
    ],
    cloze: [
      {
        id: "grammar:defining-relative:1",
        before: "The microservice",
        after: "handles payments must be PCI-compliant.",
        answer: "that",
        alts: ["which"],
        hint: { en: "no comma + identifies which specific service", ru: "без запятой + уточняет, какой именно сервис" },
      },
      {
        id: "grammar:defining-relative:2",
        before: "Developers",
        after: "write tests consistently ship with fewer regressions.",
        answer: "who",
        hint: { en: "refers to people — use 'who'", ru: "относится к людям — используйте 'who'" },
      },
    ],
  },
  {
    id: "grammar:non-defining-relative",
    band: "B2",
    domain: "engineering",
    title: { en: "Non-Defining Relative Clauses", ru: "Неопределительные придаточные предложения (с запятыми)" },
    structure: {
      en: "noun, + who/which/where + clause, (commas required; 'that' NOT allowed)",
      ru: "существительное, + who/which/where + придаточное, (запятые обязательны; 'that' недопустимо)",
    },
    explain: {
      en: "Adds extra information about something already identified. Remove it and the sentence still makes sense. Commas are mandatory. Common in RFC prose and design docs.",
      ru: "Добавляет дополнительную информацию об уже известном предмете. Без придаточного смысл сохраняется. Запятые обязательны.",
    },
    examples: [
      {
        en: "The new caching layer, which uses Redis Cluster, reduced p99 latency by 40 %.",
        ru: "Новый слой кэширования, использующий Redis Cluster, снизил p99-задержку на 40 %.",
      },
      {
        en: "Our lead architect, who joined the team last quarter, proposed the event-sourcing approach.",
        ru: "Наш ведущий архитектор, который пришёл в команду в прошлом квартале, предложил подход event sourcing.",
      },
    ],
    cloze: [
      {
        id: "grammar:non-defining-relative:1",
        before: "The staging environment,",
        after: "mirrors production exactly, caught the bug before release.",
        answer: "which",
        hint: { en: "extra info about already-identified environment — use 'which' with commas", ru: "дополнительная информация об уже известном окружении — 'which' с запятыми" },
        explain: {
          en: "'That' is never used in non-defining relative clauses.",
          ru: "'That' никогда не используется в неопределительных придаточных.",
        },
      },
      {
        id: "grammar:non-defining-relative:2",
        before: "The senior engineer,",
        after: "reviewed the RFC last week, flagged three security concerns.",
        answer: "who",
        hint: { en: "refers to a specific already-identified person", ru: "относится к конкретному уже известному человеку" },
      },
    ],
  },
  {
    id: "grammar:passive-voice",
    band: "B1",
    title: { en: "The Passive Voice", ru: "Страдательный залог" },
    structure: {
      en: "be + past participle (+ by agent)",
      ru: "be + причастие прошедшего времени (+ by + исполнитель)",
    },
    explain: {
      en: "Shift focus from who does the action to what receives it. The agent (by …) is optional — omit it when it is obvious or irrelevant. Widely used in technical documentation.",
      ru: "Переносит акцент с исполнителя на объект действия. Исполнитель (by …) необязателен — опускайте его, когда он очевиден или неважен. Широко используется в технической документации.",
    },
    examples: [
      {
        en: "The configuration is stored in environment variables.",
        ru: "Конфигурация хранится в переменных окружения.",
      },
      {
        en: "All requests are validated before they reach the business logic layer.",
        ru: "Все запросы проверяются до того, как попадают в слой бизнес-логики.",
      },
    ],
    cloze: [
      {
        id: "grammar:passive-voice:1",
        before: "Access tokens",
        after: "in short-lived JWTs to limit exposure.",
        answer: "are encoded",
        hint: { en: "focus on the tokens, not on who encodes them", ru: "акцент на токенах, а не на том, кто их кодирует" },
      },
      {
        id: "grammar:passive-voice:2",
        before: "The database schema",
        after: "every time a migration runs.",
        answer: "is updated",
        hint: { en: "present passive — the schema receives the action", ru: "настоящее страдательного залога — схема является объектом действия" },
      },
    ],
  },
  {
    id: "grammar:passive-engineering",
    band: "B2",
    domain: "engineering",
    title: { en: "Passive Voice in Engineering Register", ru: "Страдательный залог в инженерном стиле" },
    structure: {
      en: "be + past participle (past/present/perfect passive) in CI/CD and incident language",
      ru: "be + причастие прошедшего времени (прошлое/настоящее/перфектное страдательного) в языке CI/CD и инцидентов",
    },
    explain: {
      en: "Engineering writing prefers passive when the system or process is the focus, not the operator. Commit messages, CI logs, incident reports, and RFCs all heavily use passive constructions.",
      ru: "Инженерный стиль предпочитает страдательный залог, когда акцент делается на системе или процессе, а не на операторе. Коммит-сообщения, CI-логи, отчёты об инцидентах и RFC активно используют его.",
    },
    examples: [
      {
        en: "The build was triggered by a push to the main branch.",
        ru: "Сборка была запущена пушем в ветку main.",
      },
      {
        en: "The incident was caused by a misconfigured load balancer health-check timeout.",
        ru: "Инцидент был вызван неправильно настроенным таймаутом проверки состояния балансировщика.",
      },
      {
        en: "All sensitive fields have been redacted from the logs before shipping to the SIEM.",
        ru: "Все чувствительные поля были удалены из логов перед отправкой в SIEM.",
      },
    ],
    cloze: [
      {
        id: "grammar:passive-engineering:1",
        before: "Three services",
        after: "by the database connection pool exhaustion.",
        answer: "were affected",
        hint: { en: "incident report: services received the impact", ru: "отчёт об инциденте: сервисы стали объектом воздействия" },
        explain: {
          en: "Past passive 'were affected' keeps the focus on the impacted services, which is the incident report convention.",
          ru: "Прошедшее страдательного залога 'were affected' сохраняет акцент на затронутых сервисах — это соответствует формату отчёта об инциденте.",
        },
      },
      {
        id: "grammar:passive-engineering:2",
        before: "The feature flag",
        after: "to 10 % of users while the team monitors error rates.",
        answer: "has been rolled out",
        hint: { en: "perfect passive — the deployment just happened, effect still present", ru: "перфектное страдательного залога — деплой только что произошёл, результат актуален" },
      },
    ],
    register: {
      en: "Preferred in CI logs, post-mortems, RFCs, and commit messages. Avoid in conversational Slack messages where direct language reads better.",
      ru: "Предпочтителен в CI-логах, постмортемах, RFC и коммит-сообщениях. Избегайте в неформальных сообщениях в Slack.",
    },
  },
  {
    id: "grammar:modal-deduction",
    band: "B2",
    domain: "engineering",
    title: { en: "Modal Verbs of Deduction (must / might / can't)", ru: "Модальные глаголы для дедукции (must / might / can't)" },
    structure: {
      en: "must / might / may / can't + be / have + past participle",
      ru: "must / might / may / can't + be / have + причастие прошедшего времени",
    },
    explain: {
      en: "Use 'must' for strong logical deduction (certain), 'might/may' for possibility (uncertain), 'can't' for logical impossibility. Common when debugging: reasoning from evidence.",
      ru: "Используйте 'must' для уверенного логического вывода, 'might/may' для возможности (неуверенность), 'can't' для логической невозможности. Часто при отладке: рассуждения на основе улик.",
    },
    examples: [
      {
        en: "The response time spiked at 3 AM — it must be the scheduled batch job.",
        ru: "Время ответа резко выросло в 3 ночи — это наверняка плановое пакетное задание.",
      },
      {
        en: "The test passes locally but fails in CI — there might be an environment variable missing.",
        ru: "Тест проходит локально, но падает в CI — возможно, не хватает какой-то переменной окружения.",
      },
      {
        en: "The error can't be caused by the new migration; it was already present before we deployed.",
        ru: "Ошибка не может быть вызвана новой миграцией — она уже была до деплоя.",
      },
    ],
    cloze: [
      {
        id: "grammar:modal-deduction:1",
        before: "The heap dump shows 2 GB of cached objects — there",
        after: "a memory leak somewhere in the session handling code.",
        answer: "must be",
        hint: { en: "strong logical conclusion from evidence", ru: "сильный логический вывод на основе улик" },
        explain: {
          en: "'must be' = I am almost certain based on evidence. 'might be' would suggest uncertainty.",
          ru: "'must be' = я почти уверен на основе улик. 'might be' выражало бы неуверенность.",
        },
      },
      {
        id: "grammar:modal-deduction:2",
        before: "Both pods restarted at the same time — this",
        after: "a random failure; something triggered them both.",
        answer: "can't be",
        hint: { en: "logical impossibility — it cannot be coincidence", ru: "логическая невозможность — это не может быть совпадением" },
      },
    ],
  },
  {
    id: "grammar:hedging-code-review",
    band: "B2",
    domain: "engineering",
    title: { en: "Hedging in Code Review", ru: "Смягчение высказываний в ревью кода" },
    structure: {
      en: "might / may / would / should / tend to / appear to / it seems / I wonder if",
      ru: "might / may / would / should / tend to / appear to / it seems / I wonder if",
    },
    explain: {
      en: "Polite hedging softens code review comments from commands into suggestions. It preserves the author's agency and lowers defensiveness. Essential for professional English review culture.",
      ru: "Вежливые смягчители превращают замечания в ревью из приказов в предложения. Это сохраняет автономию автора и снижает защитную реакцию. Необходимо для профессиональной культуры ревью.",
    },
    examples: [
      {
        en: "This might benefit from an early return to reduce nesting.",
        ru: "Это, возможно, выиграет от раннего возврата, чтобы уменьшить вложенность.",
      },
      {
        en: "It seems like the error handling could be extracted into a shared utility.",
        ru: "Похоже, обработку ошибок можно было бы вынести в общую утилиту.",
      },
      {
        en: "I wonder if we should add a backoff strategy here — the retry loop tends to hammer the DB under load.",
        ru: "Интересно, стоит ли нам добавить здесь стратегию отступления — цикл повторных попыток, как правило, сильно нагружает БД под нагрузкой.",
      },
    ],
    cloze: [
      {
        id: "grammar:hedging-code-review:1",
        before: "This query",
        after: "benefit from pagination — returning all rows could be a problem at scale.",
        answer: "might",
        alts: ["could", "may"],
        hint: { en: "gentle suggestion, not a command", ru: "мягкое предложение, а не приказ" },
        explain: {
          en: "'Might' signals it is a suggestion the author can evaluate, not a requirement.",
          ru: "'Might' сигнализирует, что это предложение на рассмотрение автора, а не требование.",
        },
      },
      {
        id: "grammar:hedging-code-review:2",
        before: "I wonder if this lock",
        after: "be released in a finally block to prevent deadlocks.",
        answer: "should",
        alts: ["could"],
        hint: { en: "polite recommendation using 'I wonder if ... should'", ru: "вежливая рекомендация с оборотом 'I wonder if ... should'" },
      },
    ],
    register: {
      en: "Always use hedging in async review comments. It is a mark of seniority and cross-cultural awareness.",
      ru: "Всегда используйте смягчители в асинхронных комментариях ревью. Это признак зрелости и межкультурной осознанности.",
    },
  },
  {
    id: "grammar:reported-speech",
    band: "B1",
    title: { en: "Reported Speech", ru: "Косвенная речь" },
    structure: {
      en: "verb of saying + that + backshifted tense",
      ru: "глагол речи + that + сдвинутое (назад) время",
    },
    explain: {
      en: "When reporting what someone said, shift tenses back: present → past, will → would, can → could, past → past perfect. Useful for meeting notes and incident summaries.",
      ru: "При передаче чужих слов сдвигайте время назад: present → past, will → would, can → could, past → past perfect. Полезно для протоколов встреч и сводок инцидентов.",
    },
    examples: [
      {
        en: "He said that the deployment would be ready by Thursday.",
        ru: "Он сказал, что деплой будет готов к четвергу.",
        note: { en: "will → would", ru: "will → would" },
      },
      {
        en: "She explained that the regression had been introduced in the previous sprint.",
        ru: "Она объяснила, что регрессия появилась в предыдущем спринте.",
        note: { en: "past simple → past perfect", ru: "past simple → past perfect" },
      },
    ],
    cloze: [
      {
        id: "grammar:reported-speech:1",
        before: "The on-call engineer reported that the alerting system",
        after: "down for approximately 20 minutes.",
        answer: "had been",
        hint: { en: "reporting a past state → backshift to past perfect", ru: "передача прошлого состояния → сдвиг к past perfect" },
        explain: {
          en: "Direct: 'The system was down.' Reported: backshift 'was' → 'had been'.",
          ru: "Прямая речь: 'The system was down.' Косвенная: сдвигаем 'was' → 'had been'.",
        },
      },
      {
        id: "grammar:reported-speech:2",
        before: "The PM told the stakeholders that the team",
        after: "the feature in the next release.",
        answer: "would ship",
        hint: { en: "direct speech had 'will ship' — backshift to 'would ship'", ru: "в прямой речи было 'will ship' — сдвигаем к 'would ship'" },
      },
    ],
  },
  {
    id: "grammar:gerund-vs-infinitive",
    band: "B1",
    title: { en: "Gerund vs Infinitive", ru: "Герундий vs Инфинитив" },
    structure: {
      en: "verb + -ing  OR  verb + to + infinitive  (depends on the preceding verb)",
      ru: "глагол + -ing  ИЛИ  глагол + to + инфинитив  (зависит от предшествующего глагола)",
    },
    explain: {
      en: "Some verbs take a gerund (enjoy, avoid, consider, recommend, finish), others take an infinitive (want, decide, plan, manage, refuse), and some take both with different meanings (stop, remember, try).",
      ru: "Одни глаголы требуют герундия (enjoy, avoid, consider, recommend, finish), другие — инфинитива (want, decide, plan, manage, refuse), некоторые принимают оба варианта с разным значением (stop, remember, try).",
    },
    examples: [
      {
        en: "I recommend extracting this logic into a separate module.",
        ru: "Я рекомендую вынести эту логику в отдельный модуль.",
        note: { en: "recommend + gerund", ru: "recommend + герундий" },
      },
      {
        en: "We decided to adopt trunk-based development to speed up delivery.",
        ru: "Мы решили перейти на trunk-based development, чтобы ускорить поставку.",
        note: { en: "decide + infinitive", ru: "decide + инфинитив" },
      },
    ],
    cloze: [
      {
        id: "grammar:gerund-vs-infinitive:1",
        before: "The team avoided",
        after: "long-lived feature branches after the last merge nightmare.",
        answer: "using",
        hint: { en: "avoid always takes the gerund (-ing)", ru: "avoid всегда требует герундия (-ing)" },
      },
      {
        id: "grammar:gerund-vs-infinitive:2",
        before: "We managed",
        after: "the P0 bug before the morning standup.",
        answer: "to fix",
        hint: { en: "manage always takes the infinitive", ru: "manage всегда требует инфинитива" },
        explain: {
          en: "'Manage' is always followed by to + infinitive — it means succeeding at something difficult.",
          ru: "'Manage' всегда сочетается с to + инфинитив — значит 'удаётся сделать что-то трудное'.",
        },
      },
    ],
  },
  {
    id: "grammar:articles-abstract",
    band: "B2",
    title: { en: "Articles with Abstract and Uncountable Nouns", ru: "Артикли с абстрактными и неисчисляемыми существительными" },
    structure: {
      en: "zero article with general abstract nouns; 'the' for specific/unique instances",
      ru: "нулевой артикль с абстрактными существительными в общем смысле; 'the' для конкретных/уникальных случаев",
    },
    explain: {
      en: "Abstract nouns (performance, scalability, reliability, complexity) used in a general sense take no article. When referring to a specific instance or known concept, use 'the'. A common mistake for Russian speakers: writing 'the performance' when you mean performance in general.",
      ru: "Абстрактные существительные (performance, scalability, reliability, complexity) в общем смысле употребляются без артикля. Для конкретного случая или известного понятия — 'the'. Частая ошибка русскоязычных: 'the performance', когда имеется в виду производительность вообще.",
    },
    examples: [
      {
        en: "Scalability is a core concern in distributed system design.",
        ru: "Масштабируемость — ключевая задача при проектировании распределённых систем.",
        note: { en: "general concept — no article", ru: "общее понятие — без артикля" },
      },
      {
        en: "We need to improve the performance of the authentication service.",
        ru: "Нам нужно улучшить производительность сервиса аутентификации.",
        note: { en: "specific service's performance — 'the'", ru: "производительность конкретного сервиса — 'the'" },
      },
    ],
    cloze: [
      {
        id: "grammar:articles-abstract:1",
        before: "Premature",
        after: "is the root of much wasted engineering effort.",
        answer: "optimization",
        alts: ["optimisation"],
        hint: { en: "abstract uncountable noun as a general concept — note there is NO article before it", ru: "абстрактное неисчисляемое существительное как общее понятие — обрати внимание: артикля перед ним нет" },
        explain: {
          en: "As a general concept the noun takes zero article — we never say 'the premature optimization' here. 'The' would only appear for a specific, identified instance.",
          ru: "Как общее понятие существительное идёт без артикля — здесь нельзя сказать 'the premature optimization'. 'The' появилось бы только для конкретного, определённого случая.",
        },
      },
      {
        id: "grammar:articles-abstract:2",
        before: "We measured",
        after: "latency of the new caching layer under peak load.",
        answer: "the",
        hint: { en: "specific latency of a specific component — use 'the'", ru: "конкретная задержка конкретного компонента — используйте 'the'" },
      },
    ],
  },
  {
    id: "grammar:comparatives-intensifiers",
    band: "B1",
    domain: "engineering",
    title: { en: "Comparatives and Intensifiers", ru: "Степени сравнения и усилители" },
    structure: {
      en: "far / significantly / slightly / considerably + comparative adjective/adverb",
      ru: "far / significantly / slightly / considerably + прилагательное/наречие в сравнительной степени",
    },
    explain: {
      en: "Bare comparatives ('faster', 'cheaper') are vague. Intensifiers quantify the degree of difference — essential in technical writing, benchmarks, and incident reports.",
      ru: "Просто сравнительная степень ('faster', 'cheaper') расплывчата. Усилители уточняют степень разницы — необходимы в технических текстах, результатах бенчмарков и отчётах об инцидентах.",
    },
    examples: [
      {
        en: "The new indexing strategy is significantly faster for range queries.",
        ru: "Новая стратегия индексирования значительно быстрее для запросов по диапазону.",
      },
      {
        en: "Memory consumption is slightly higher but well within our SLO budget.",
        ru: "Потребление памяти немного выше, но хорошо укладывается в наш бюджет SLO.",
      },
      {
        en: "Throughput is far greater when batching writes compared to individual inserts.",
        ru: "Пропускная способность намного выше при пакетной записи по сравнению с отдельными вставками.",
      },
    ],
    cloze: [
      {
        id: "grammar:comparatives-intensifiers:1",
        before: "Cold-start latency is",
        after: "higher for Lambda functions with large dependencies.",
        answer: "considerably",
        alts: ["significantly", "far", "much"],
        hint: { en: "choose an intensifier that shows a notable difference", ru: "выберите усилитель, показывающий заметную разницу" },
      },
      {
        id: "grammar:comparatives-intensifiers:2",
        before: "The optimised query is",
        after: "more readable and runs three times faster.",
        answer: "far",
        alts: ["much", "considerably", "significantly"],
        hint: { en: "'far more readable' — intensifier before comparative", ru: "'far more readable' — усилитель перед сравнительной степенью" },
      },
    ],
  },
  {
    id: "grammar:discourse-markers",
    band: "B2",
    domain: "engineering",
    title: { en: "Discourse and Linking Markers", ru: "Дискурсивные и связующие маркеры" },
    structure: {
      en: "however / whereas / given that / therefore / consequently / in contrast / as a result",
      ru: "however / whereas / given that / therefore / consequently / in contrast / as a result",
    },
    explain: {
      en: "Linking markers signal the logical relationship between sentences or clauses. They are the backbone of well-structured RFCs, design docs, and PR descriptions. Overusing 'but' or 'so' marks informal writing.",
      ru: "Связующие маркеры указывают на логическую связь между предложениями или частями предложения. Они — основа хорошо структурированных RFC, проектных документов и описаний PR. Частое употребление 'but' или 'so' — признак неформального стиля.",
    },
    examples: [
      {
        en: "The monolith is easier to deploy; however, it does not scale horizontally.",
        ru: "Монолит проще развёртывать; однако он не масштабируется горизонтально.",
      },
      {
        en: "Service A is synchronous, whereas Service B uses an event-driven model.",
        ru: "Сервис A синхронный, тогда как сервис B использует событийную модель.",
      },
      {
        en: "Given that the SLA requires 99.9 % uptime, we must implement redundancy.",
        ru: "Учитывая, что SLA требует 99,9 % времени безотказной работы, мы должны реализовать резервирование.",
      },
    ],
    cloze: [
      {
        id: "grammar:discourse-markers:1",
        before: "The current approach works well for small datasets;",
        after: ", it degrades quickly once row count exceeds 10 million.",
        answer: "however",
        hint: { en: "contrast between two facts — use 'however'", ru: "противопоставление двух фактов — используйте 'however'" },
        explain: {
          en: "'However' signals contrast and is appropriate in formal written style. 'But' would be informal here.",
          ru: "'However' указывает на контраст и подходит для формального письменного стиля. 'But' — неформально.",
        },
      },
      {
        id: "grammar:discourse-markers:2",
        before: "The connection pool was exhausted;",
        after: ", all new requests started timing out.",
        answer: "as a result",
        alts: ["consequently", "therefore"],
        hint: { en: "cause → effect relationship", ru: "связь причина → следствие" },
      },
    ],
    register: {
      en: "Use in written RFCs, design docs, post-mortems. In Slack or standups 'but' and 'so' are fine.",
      ru: "Используйте в письменных RFC, проектных документах, постмортемах. В Slack и на стендапах 'but' и 'so' вполне уместны.",
    },
  },
  {
    id: "grammar:future-forms",
    band: "B1",
    domain: "engineering",
    title: { en: "Future Forms: will vs going to vs Present Continuous", ru: "Формы будущего: will vs going to vs Present Continuous" },
    structure: {
      en: "will + inf (prediction/promise/instant decision)  |  going to + inf (plan/evidence)  |  present continuous (arranged future)",
      ru: "will + инф (предсказание/обещание/спонтанное решение)  |  going to + инф (план/очевидность)  |  Present Continuous (договорённость)",
    },
    explain: {
      en: "'Will' for on-the-spot decisions, predictions, and promises. 'Going to' for existing plans or when evidence points to an outcome. Present continuous for fixed scheduled arrangements.",
      ru: "'Will' для спонтанных решений, предсказаний и обещаний. 'Going to' для заранее намеченных планов или когда есть явные признаки исхода. Present Continuous для запланированных и согласованных мероприятий.",
    },
    examples: [
      {
        en: "I'll fix that typo right now — just noticed it.",
        ru: "Я сейчас же исправлю эту опечатку — только что заметил.",
        note: { en: "instant decision → will", ru: "мгновенное решение → will" },
      },
      {
        en: "We're going to migrate to the new auth service next sprint — it's already on the roadmap.",
        ru: "Мы собираемся перейти на новый сервис аутентификации в следующем спринте — это уже в роадмапе.",
        note: { en: "existing plan → going to", ru: "заранее намеченный план → going to" },
      },
      {
        en: "The team is deploying the hotfix at 14:00 UTC tomorrow.",
        ru: "Завтра в 14:00 UTC команда выполняет деплой хотфикса.",
        note: { en: "arranged/scheduled → present continuous", ru: "договорённость/расписание → Present Continuous" },
      },
    ],
    cloze: [
      {
        id: "grammar:future-forms:1",
        before: "The load is already at 95 % — the servers",
        after: "crash if we don't add capacity.",
        answer: "are going to",
        hint: { en: "evidence (95 % load) points to an imminent outcome — going to", ru: "признаки (95 % нагрузки) указывают на неминуемый исход — going to" },
        explain: {
          en: "'Going to' is used when there is present evidence pointing to a near-future event.",
          ru: "'Going to' используется при наличии текущих признаков, указывающих на ближайшее событие.",
        },
      },
      {
        id: "grammar:future-forms:2",
        before: "We",
        after: "the release retrospective on Friday at 16:00 — it's in the calendar.",
        answer: "are having",
        alts: ["are running"],
        hint: { en: "scheduled arrangement already in the calendar — present continuous", ru: "запланированное мероприятие уже в календаре — Present Continuous" },
      },
    ],
  },
  {
    id: "grammar:passive-perfect-engineering",
    band: "B2",
    domain: "engineering",
    title: { en: "Perfect Passive in Engineering Docs", ru: "Перфектный пассив в инженерных документах" },
    structure: {
      en: "has/have been + past participle",
      ru: "has/have been + причастие прошедшего времени",
    },
    explain: {
      en: "The perfect passive combines present relevance (present perfect) with a focus on the object rather than the actor (passive). Extremely common in change logs, release notes, and PR descriptions: 'The endpoint has been deprecated'.",
      ru: "Перфектный пассив сочетает актуальность для настоящего (present perfect) с акцентом на объект, а не деятеля (пассив). Очень распространён в логах изменений, заметках о выпуске и описаниях PR.",
    },
    examples: [
      {
        en: "The legacy /v1/users endpoint has been removed in this release.",
        ru: "Устаревший эндпоинт /v1/users удалён в этом релизе.",
      },
      {
        en: "All API keys have been rotated following the security audit.",
        ru: "Все API-ключи были обновлены после аудита безопасности.",
      },
    ],
    cloze: [
      {
        id: "grammar:passive-perfect-engineering:1",
        before: "The deprecated configuration format",
        after: "by a YAML-based schema in v3.0.",
        answer: "has been replaced",
        hint: { en: "current release note: past action with present relevance, no named actor", ru: "заметка текущего релиза: прошлое действие с актуальностью в настоящем, деятель не назван" },
        explain: {
          en: "Perfect passive 'has been replaced' = the replacement happened at some past point and the result is visible now.",
          ru: "Перфектный пассив 'has been replaced' = замена произошла в прошлом, результат виден сейчас.",
        },
      },
      {
        id: "grammar:passive-perfect-engineering:2",
        before: "Three critical CVEs",
        after: "in this patch release.",
        answer: "have been addressed",
        hint: { en: "multiple items, relevant now, actor unimportant — perfect passive", ru: "несколько элементов, актуально сейчас, деятель неважен — перфектный пассив" },
      },
    ],
    register: {
      en: "Standard in CHANGELOG, release notes, and migration guides. Signals that work is done and the reader does not need to know who did it.",
      ru: "Стандарт для CHANGELOG, заметок о выпуске и руководств по миграции. Сигнализирует, что работа выполнена; читателю не нужно знать, кто именно.",
    },
  },
  {
    id: "grammar:question-tags",
    band: "B1",
    title: { en: "Question Tags", ru: "Разделительные вопросы (хвостовые вопросы)" },
    structure: {
      en: "positive clause + negative tag  /  negative clause + positive tag",
      ru: "утвердительное предложение + отрицательный тег  /  отрицательное предложение + положительный тег",
    },
    explain: {
      en: "Question tags invite confirmation or seek agreement. The auxiliary in the tag matches the main clause. Common in standups and pair-programming: 'This test covers the edge case, doesn't it?'",
      ru: "Разделительные вопросы приглашают к подтверждению или согласию. Вспомогательный глагол в теге совпадает с главным предложением. Часты на стендапах и при парном программировании.",
    },
    examples: [
      {
        en: "The migration script is idempotent, isn't it?",
        ru: "Скрипт миграции идемпотентен, не так ли?",
      },
      {
        en: "You haven't pushed to main directly, have you?",
        ru: "Ты ведь не пушил напрямую в main, правда?",
      },
    ],
    cloze: [
      {
        id: "grammar:question-tags:1",
        before: "The staging environment mirrors production exactly,",
        after: "?",
        answer: "doesn't it",
        hint: { en: "positive clause → negative tag; main verb 'mirrors' → does/doesn't", ru: "утвердительное предложение → отрицательный тег; глагол 'mirrors' → does/doesn't" },
        explain: {
          en: "Main clause is positive with present simple 'mirrors' → tag is 'doesn't it'.",
          ru: "Главное предложение положительное, Present Simple 'mirrors' → тег 'doesn't it'.",
        },
      },
      {
        id: "grammar:question-tags:2",
        before: "We can't roll back the schema change without downtime,",
        after: "?",
        answer: "can we",
        hint: { en: "negative clause → positive tag; auxiliary 'can'", ru: "отрицательное предложение → положительный тег; вспомогательный 'can'" },
      },
    ],
  },
  {
    id: "grammar:wish-regret",
    band: "B2",
    title: { en: "Wish / If only — Regret and Hypothetical", ru: "Wish / If only — сожаление и гипотетическое желание" },
    structure: {
      en: "wish/if only + past simple (present regret) | wish/if only + past perfect (past regret) | wish + would (desire for change)",
      ru: "wish/if only + past simple (сожаление о настоящем) | wish/if only + past perfect (сожаление о прошлом) | wish + would (желание перемен)",
    },
    explain: {
      en: "'Wish + past simple' expresses dissatisfaction with the present. 'Wish + past perfect' expresses regret about the past. 'Wish + would' expresses desire for behaviour to change — useful in retrospective discussions.",
      ru: "'Wish + past simple' выражает недовольство настоящим. 'Wish + past perfect' — сожаление о прошлом. 'Wish + would' — желание изменения поведения. Используется на ретроспективах.",
    },
    examples: [
      {
        en: "I wish we had better observability tooling right now.",
        ru: "Жаль, что у нас сейчас нет лучших инструментов наблюдаемости.",
        note: { en: "present regret → wish + past simple", ru: "сожаление о настоящем → wish + past simple" },
      },
      {
        en: "If only we had documented the API before the original author left.",
        ru: "Если бы только мы задокументировали API до ухода первоначального автора.",
        note: { en: "past regret → if only + past perfect", ru: "сожаление о прошлом → if only + past perfect" },
      },
    ],
    cloze: [
      {
        id: "grammar:wish-regret:1",
        before: "I wish the CI pipeline",
        after: "faster — waiting 40 minutes per build kills productivity.",
        answer: "were",
        alts: ["was"],
        hint: { en: "present regret about current state — wish + past simple ('were' preferred in formal English)", ru: "сожаление о текущем состоянии — wish + past simple ('were' предпочтительнее в формальном стиле)" },
      },
      {
        id: "grammar:wish-regret:2",
        before: "If only we",
        after: "a load test before the Black Friday launch.",
        answer: "had run",
        hint: { en: "regret about a past action we failed to do — past perfect", ru: "сожаление о действии в прошлом, которое мы не совершили — past perfect" },
        explain: {
          en: "'Had run' is past perfect — we regret not running the test before the event.",
          ru: "'Had run' — past perfect: мы сожалеем, что не провели тест до события.",
        },
      },
    ],
  },
];
