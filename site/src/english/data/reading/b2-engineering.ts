import type { ReadingUnit } from "~/english/types";

export const b2Engineering: ReadingUnit[] = [
  // ── 1. Incident postmortem ──────────────────────────────────────────────────
  {
    id: "b2e-postmortem-db",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Postmortem: Database Connection Pool Exhaustion — 2026-04-14",
      ru: "Постмортем: Исчерпание пула соединений БД — 14 апреля 2026",
    },
    blurb: {
      en: "A production incident where a misconfigured connection pool brought down the payments API for 23 minutes. The root cause was traced back to a framework upgrade that silently changed the default pool size.",
      ru: "Инцидент в продакшене, при котором неправильно настроенный пул соединений вывел из строя платёжное API на 23 минуты. Первопричина была отслежена до обновления фреймворка, которое незаметно изменило размер пула по умолчанию.",
    },
    source: { en: "Incident postmortem", ru: "Постмортем инцидента" },
    passages: [
      {
        en: "On 2026-04-14 at 03:17 UTC, the payments service began returning HTTP 503 responses at a rate that exceeded the SLO error budget within four minutes. The incident was detected automatically by our uptime monitor, and an alert was sent to the on-call engineer via PagerDuty.",
        ru: "14 апреля 2026 года в 03:17 UTC платёжный сервис начал возвращать HTTP 503-ответы со скоростью, превысившей бюджет ошибок SLO в течение четырёх минут. Инцидент был автоматически обнаружен монитором доступности, и дежурный инженер получил оповещение через PagerDuty.",
        words: [
          {
            id: "b2e-postmortem-db:w1",
            w: "exhaustion",
            ru: "исчерпание, истощение",
            gloss: "the state of being completely used up or depleted",
            ipa: "/ɪɡˈzɔːs.tʃən/",
            pos: "noun",
            example: "Connection pool exhaustion was identified as the root cause.",
          },
        ],
      },
      {
        en: "The root cause was traced to a silent breaking change introduced in v4.12.0 of our ORM framework. The default maximum pool size had been reduced from 100 to 10 in that release. This change was not highlighted in the changelog, and our automated dependency-upgrade bot had applied the update without triggering a canary deployment.",
        ru: "Первопричина была отслежена до скрытого критического изменения, введённого в версии 4.12.0 нашего ORM-фреймворка. Максимальный размер пула по умолчанию в этой версии был уменьшен со 100 до 10. Это изменение не было выделено в журнале изменений, а наш бот автоматического обновления зависимостей применил обновление, не запустив канареечное развёртывание.",
        words: [
          {
            id: "b2e-postmortem-db:w2",
            w: "framework",
            ru: "фреймворк, платформа",
            gloss: "a reusable software structure providing generic functionality",
            ipa: "/ˈfreɪm.wɜːk/",
            pos: "noun",
            example: "The ORM framework was upgraded without a canary test.",
          },
        ],
      },
      {
        en: "It was observed that under normal traffic, the reduced pool size appeared sufficient. The failure was only triggered once a batch job was scheduled at 03:15 UTC, which opened 85 long-lived connections simultaneously. The remaining capacity was insufficient to serve real-time payment requests.",
        ru: "Было замечено, что при нормальном трафике уменьшенный размер пула выглядел достаточным. Сбой был спровоцирован только после запуска пакетного задания в 03:15 UTC, которое одновременно открыло 85 долгоживущих соединений. Оставшейся ёмкости оказалось недостаточно для обслуживания запросов к платёжной системе в режиме реального времени.",
      },
      {
        en: "The mitigation was applied at 03:40 UTC: the pool size was explicitly set to 150 in the application configuration, and the service was restarted in a rolling fashion across all nodes. It should be noted that the explicit override should have been present in the configuration from the outset, rather than relying on a framework default.",
        ru: "Устранение было применено в 03:40 UTC: размер пула был явно установлен равным 150 в конфигурации приложения, и сервис был перезапущен поочерёдно на всех узлах. Следует отметить, что явное переопределение должно было присутствовать в конфигурации с самого начала, а не полагаться на значение по умолчанию фреймворка.",
      },
      {
        en: "Several action items were identified. The dependency upgrade pipeline should be configured to require canary promotion before merging to main. Additionally, all framework default values that affect resource limits should be considered sensitive configuration and must be pinned explicitly. A linter rule is to be introduced to detect implicit pool size reliance.",
        ru: "Были определены несколько пунктов действий. Конвейер обновления зависимостей должен быть настроен так, чтобы требовать канареечного продвижения перед слиянием в main. Кроме того, все значения по умолчанию фреймворка, влияющие на ограничения ресурсов, должны считаться чувствительной конфигурацией и обязательно фиксироваться явно. Планируется ввести правило линтера для обнаружения неявной зависимости от размера пула.",
      },
    ],
    phrases: [
      {
        id: "b2e-postmortem-db:p1",
        en: "was traced to",
        ru: "было отслежено до / стало следствием",
        note: { en: "Used to describe root-cause attribution in incident reports.", ru: "Используется для обозначения первопричины в отчётах об инцидентах." },
      },
      {
        id: "b2e-postmortem-db:p2",
        en: "silent breaking change",
        ru: "скрытое критическое изменение",
        note: { en: "A change that breaks behavior without being documented or flagged.", ru: "Изменение, нарушающее поведение без документирования или предупреждения." },
      },
      {
        id: "b2e-postmortem-db:p3",
        en: "action items were identified",
        ru: "были определены пункты действий",
        note: { en: "Standard postmortem phrasing for follow-up tasks.", ru: "Стандартная формулировка постмортема для задач последующих действий." },
      },
    ],
    questions: [
      {
        id: "b2e-postmortem-db:q1",
        q: { en: "What was the immediate trigger that caused pool exhaustion on April 14?", ru: "Что стало непосредственным триггером исчерпания пула 14 апреля?" },
        options: [
          { en: "A spike in user payment requests", ru: "Всплеск запросов пользователей к платёжной системе" },
          { en: "A batch job opening 85 long-lived connections", ru: "Пакетное задание, открывшее 85 долгоживущих соединений" },
          { en: "A network outage between the app and database", ru: "Сетевой сбой между приложением и базой данных" },
          { en: "A misconfigured firewall rule", ru: "Неправильно настроенное правило файрвола" },
        ],
        answer: 1,
        explain: {
          en: "The batch job at 03:15 UTC consumed 85 of the 10-slot pool, leaving no capacity for real-time requests.",
          ru: "Пакетное задание в 03:15 UTC заняло 85 из 10 слотов пула, не оставив ёмкости для запросов реального времени.",
        },
      },
      {
        id: "b2e-postmortem-db:q2",
        q: { en: "Why was the breaking change not caught before deployment?", ru: "Почему критическое изменение не было обнаружено до развёртывания?" },
        options: [
          { en: "The changelog was written in a foreign language", ru: "Журнал изменений был написан на иностранном языке" },
          { en: "No tests existed for the ORM integration", ru: "Тестов для интеграции ORM не существовало" },
          { en: "The bot applied the update without a canary deployment", ru: "Бот применил обновление без канареечного развёртывания" },
        ],
        answer: 2,
        explain: {
          en: "The dependency bot merged the upgrade straight to main without requiring canary promotion, so the change was never exercised under batch-load conditions.",
          ru: "Бот слил обновление прямо в main без канареечного продвижения, поэтому изменение никогда не проверялось в условиях пакетной нагрузки.",
        },
      },
      {
        id: "b2e-postmortem-db:q3",
        q: { en: "What does the postmortem recommend regarding framework default values?", ru: "Что постмортем рекомендует в отношении значений по умолчанию фреймворка?" },
        options: [
          { en: "They should be documented in the team wiki", ru: "Их следует документировать в командной вики" },
          { en: "They should be treated as sensitive config and pinned explicitly", ru: "Их следует рассматривать как чувствительную конфигурацию и явно фиксировать" },
          { en: "They should be removed from all production systems", ru: "Их следует удалить из всех производственных систем" },
          { en: "They should be reviewed monthly by the SRE team", ru: "Их следует ежемесячно проверять командой SRE" },
        ],
        answer: 1,
        explain: {
          en: "The postmortem states that default values affecting resource limits must be explicitly pinned in application configuration.",
          ru: "Постмортем указывает, что значения по умолчанию, влияющие на лимиты ресурсов, должны явно фиксироваться в конфигурации приложения.",
        },
      },
    ],
    targetWords: ["ngsl:2042", "ngsl:2143", "ngsl:2224", "ngsl:2045", "ngsl:2044", "ngsl:2098", "ngsl:2049"],
  },

  // ── 2. RFC / design doc section ────────────────────────────────────────────
  {
    id: "b2e-rfc-rate-limit",
    level: "B2",
    stream: "engineering",
    title: {
      en: "RFC 0047: Adaptive Rate Limiting for the Public API Gateway",
      ru: "RFC 0047: Адаптивное ограничение частоты запросов для публичного API-шлюза",
    },
    blurb: {
      en: "A design proposal for replacing the fixed-window rate limiter with a token-bucket implementation that adjusts limits based on real-time capacity signals from downstream services.",
      ru: "Предложение по замене ограничителя с фиксированным окном на реализацию алгоритма маркерного ведра, которая корректирует лимиты на основе сигналов о реальной ёмкости нижележащих сервисов.",
    },
    source: { en: "RFC / design doc section", ru: "RFC / раздел проектного документа" },
    passages: [
      {
        en: "This RFC proposes replacing the current fixed-window rate limiter in the API gateway with a token-bucket algorithm that should be capable of adapting its effective throughput cap based on latency signals received from downstream microservices. The motivation is that our existing limiter applies a uniform ceiling regardless of the health of the services behind it.",
        ru: "Данный RFC предлагает заменить текущий ограничитель с фиксированным окном в API-шлюзе на алгоритм маркерного ведра, который должен быть способен адаптировать эффективный порог пропускной способности на основе сигналов задержки, получаемых от нижележащих микросервисов. Мотивация заключается в том, что наш существующий ограничитель применяет равномерный потолок вне зависимости от состояния сервисов за ним.",
        words: [
          {
            id: "b2e-rfc-rate-limit:w1",
            w: "cap",
            ru: "ограничение, потолок",
            gloss: "an upper limit placed on a quantity or rate",
            ipa: "/kæp/",
            pos: "noun",
            example: "The throughput cap was set to 500 RPS per tenant.",
          },
        ],
      },
      {
        en: "It is proposed that the gateway maintain a sliding estimate of the p99 latency for each upstream target. When the p99 latency for a given target exceeds a configurable threshold — suggested at 200 ms — the token refill rate for requests routed to that target should be reduced by 20%. This process is to be repeated in discrete steps until latency recovers or the minimum floor is reached.",
        ru: "Предлагается, чтобы шлюз поддерживал скользящую оценку задержки p99 для каждого целевого апстрима. Когда задержка p99 для данной цели превышает настраиваемый порог — предложено значение 200 мс — скорость пополнения маркеров для запросов, маршрутизируемых к этой цели, должна быть снижена на 20%. Этот процесс следует повторять дискретными шагами до восстановления задержки или достижения минимального порога.",
        words: [
          {
            id: "b2e-rfc-rate-limit:w2",
            w: "frequency",
            ru: "частота",
            gloss: "how often something occurs per unit of time",
            ipa: "/ˈfriː.kwən.si/",
            pos: "noun",
            example: "Increasing the polling frequency will raise CPU overhead.",
          },
        ],
      },
      {
        en: "There are several concerns that must be addressed before this proposal can be accepted. First, the latency signal might be subject to spurious spikes that do not reflect sustained degradation. It is therefore recommended that a minimum observation window of 30 seconds be applied before any reduction is enacted.",
        ru: "Необходимо рассмотреть ряд вопросов, прежде чем данное предложение может быть принято. Во-первых, сигнал задержки может быть подвержен ложным всплескам, не отражающим устойчивое ухудшение. Поэтому рекомендуется применять минимальное окно наблюдения в 30 секунд перед внесением каких-либо снижений.",
      },
      {
        en: "Second, the token-bucket state must be stored in a shared, low-latency data store accessible to all gateway replicas. Redis is the preferred candidate, though it should be noted that any Redis outage would effectively disable adaptive rate limiting, causing the system to fall back to the static ceiling. This fallback behaviour is considered acceptable for the current maturity level of the platform.",
        ru: "Во-вторых, состояние маркерного ведра должно храниться в общем хранилище данных с низкой задержкой, доступном для всех реплик шлюза. Предпочтительным кандидатом является Redis, хотя следует отметить, что любой сбой Redis фактически отключит адаптивное ограничение частоты, заставив систему вернуться к статическому потолку. Это резервное поведение считается приемлемым для текущего уровня зрелости платформы.",
      },
      {
        en: "The implementation is expected to be delivered in two milestones. The first milestone covers the token-bucket core and Redis integration, with the static limit preserved as the initial refill rate. The second milestone introduces the latency-feedback loop and the gradual step-down logic. An RFC amendment should be filed if the step-down parameters need to be adjusted based on findings from the initial rollout.",
        ru: "Реализация планируется в два этапа. Первый этап охватывает ядро маркерного ведра и интеграцию с Redis, при этом статический лимит сохраняется в качестве начальной скорости пополнения. Второй этап вводит цикл обратной связи по задержке и логику постепенного снижения. Поправка к RFC должна быть подана, если параметры снижения потребуют корректировки по результатам первоначального развёртывания.",
      },
    ],
    phrases: [
      {
        id: "b2e-rfc-rate-limit:p1",
        en: "it is proposed that",
        ru: "предлагается, чтобы",
        note: { en: "Formal passive construction for introducing RFC proposals.", ru: "Формальная пассивная конструкция для введения предложений RFC." },
      },
      {
        id: "b2e-rfc-rate-limit:p2",
        en: "fall back to",
        ru: "возвращаться к (резервному варианту)",
        note: { en: "Used when a system reverts to a simpler or safer mode.", ru: "Используется, когда система возвращается к более простому или безопасному режиму." },
      },
      {
        id: "b2e-rfc-rate-limit:p3",
        en: "must be addressed before",
        ru: "необходимо рассмотреть до",
        note: { en: "RFC language for pre-acceptance blockers.", ru: "Язык RFC для блокеров, требующих решения перед принятием." },
      },
    ],
    questions: [
      {
        id: "b2e-rfc-rate-limit:q1",
        q: { en: "Why is a 30-second observation window recommended before reducing the token refill rate?", ru: "Почему рекомендуется 30-секундное окно наблюдения перед снижением скорости пополнения маркеров?" },
        options: [
          { en: "To give engineers time to review the metrics dashboard", ru: "Чтобы дать инженерам время просмотреть панель метрик" },
          { en: "To avoid reacting to spurious latency spikes that are not sustained", ru: "Чтобы избежать реакции на ложные всплески задержки, которые не являются устойчивыми" },
          { en: "Because Redis requires 30 seconds to propagate state changes", ru: "Потому что Redis требует 30 секунд для распространения изменений состояния" },
        ],
        answer: 1,
        explain: {
          en: "The RFC notes that latency might exhibit spurious spikes; a 30-second window filters these out before any rate reduction is applied.",
          ru: "RFC указывает, что задержка может демонстрировать ложные всплески; 30-секундное окно отфильтровывает их до применения любого снижения частоты.",
        },
      },
      {
        id: "b2e-rfc-rate-limit:q2",
        q: { en: "What happens to rate limiting if Redis becomes unavailable?", ru: "Что происходит с ограничением частоты, если Redis становится недоступен?" },
        options: [
          { en: "All API requests are rejected with HTTP 429", ru: "Все API-запросы отклоняются с HTTP 429" },
          { en: "The gateway disables rate limiting entirely", ru: "Шлюз полностью отключает ограничение частоты" },
          { en: "The system falls back to the static rate ceiling", ru: "Система возвращается к статическому потолку частоты" },
          { en: "The gateway restarts automatically", ru: "Шлюз перезапускается автоматически" },
        ],
        answer: 2,
        explain: {
          en: "A Redis outage disables the adaptive logic, and the gateway reverts to the static ceiling — described as an acceptable fallback.",
          ru: "Сбой Redis отключает адаптивную логику, и шлюз возвращается к статическому потолку — это описывается как приемлемое резервное поведение.",
        },
      },
      {
        id: "b2e-rfc-rate-limit:q3",
        q: { en: "In which milestone is the latency-feedback loop introduced?", ru: "В каком этапе вводится цикл обратной связи по задержке?" },
        options: [
          { en: "Milestone 1", ru: "Этап 1" },
          { en: "Milestone 2", ru: "Этап 2" },
          { en: "A separate RFC amendment", ru: "Отдельная поправка к RFC" },
        ],
        answer: 1,
        explain: {
          en: "Milestone 1 focuses on the token-bucket core and Redis integration; the latency loop is a Milestone 2 deliverable.",
          ru: "Этап 1 сосредоточен на ядре маркерного ведра и интеграции с Redis; цикл задержки является результатом Этапа 2.",
        },
      },
    ],
    targetWords: ["ngsl:2372", "ngsl:2169", "ngsl:2293", "ngsl:2202", "ngsl:2022", "ngsl:2143", "ngsl:2252"],
  },

  // ── 3. Pull-request review thread ──────────────────────────────────────────
  {
    id: "b2e-pr-cache-layer",
    level: "B2",
    stream: "engineering",
    title: {
      en: "PR #3841 Review: Introduce Redis Caching Layer for User Profiles",
      ru: "Ревью PR #3841: Добавление кеширующего слоя Redis для профилей пользователей",
    },
    blurb: {
      en: "A senior engineer reviews a pull request that adds a Redis-backed cache in front of the user-profile service. The review surfaces cache invalidation gaps, TTL choices, and missing observability.",
      ru: "Старший инженер выполняет ревью пулл-реквеста, добавляющего кеш на основе Redis перед сервисом профилей пользователей. В ревью выявляются пробелы в инвалидации кеша, выбор TTL и отсутствие наблюдаемости.",
    },
    source: { en: "Pull-request review thread", ru: "Тред ревью пулл-реквеста" },
    passages: [
      {
        en: "mkowalski (reviewer): The overall approach looks reasonable, and the benchmark numbers are promising — p99 read latency is projected to drop from 140 ms to 18 ms for cache hits. However, there are several issues that should be resolved before this is merged.",
        ru: "mkowalski (ревьюер): Общий подход выглядит разумным, и числа из бенчмарков обнадёживают — ожидаемое снижение задержки p99 чтения с 140 мс до 18 мс при попаданиях в кеш. Однако есть ряд проблем, которые следует устранить до слияния.",
      },
      {
        en: "mkowalski: The cache key is constructed as user:{id}, but I notice that the profile update handler does not appear to call cache.delete(key) after writing to the database. This might result in stale profile data being served for up to the TTL duration. It is strongly recommended that write-through invalidation or explicit deletion be added.",
        ru: "mkowalski: Ключ кеша строится как user:{id}, но я замечаю, что обработчик обновления профиля, похоже, не вызывает cache.delete(key) после записи в базу данных. Это может привести к тому, что устаревшие данные профиля будут отдаваться на протяжении до TTL. Настоятельно рекомендуется добавить сквозную инвалидацию или явное удаление.",
        words: [
          {
            id: "b2e-pr-cache-layer:w1",
            w: "layer",
            ru: "слой, уровень",
            gloss: "a distinct level or component in a system stack",
            ipa: "/ˈleɪ.ər/",
            pos: "noun",
            example: "A caching layer was introduced to reduce database load.",
          },
        ],
      },
      {
        en: "devchandra (author): Good catch — that path was missed during the initial implementation. A cache.delete call will be added in the profile update service. Regarding TTL: the current value of 3600 seconds was chosen to match the session token lifetime, which should ensure that a user's cached profile does not outlive their session.",
        ru: "devchandra (автор): Верное замечание — этот путь был пропущен при первоначальной реализации. Вызов cache.delete будет добавлен в сервис обновления профиля. Относительно TTL: текущее значение в 3600 секунд было выбрано для соответствия сроку жизни токена сессии, что должно гарантировать, что кешированный профиль пользователя не переживёт его сессию.",
      },
      {
        en: "mkowalski: The TTL reasoning is sound, though it should be considered that an admin who revokes a user's access would not see the change reflected for up to an hour if the profile is cached. Depending on the security requirements, a shorter TTL or an event-driven invalidation approach may be warranted. This is not a blocker for this PR but should be tracked as a follow-up.",
        ru: "mkowalski: Обоснование TTL разумно, хотя следует учитывать, что администратор, отозвавший доступ пользователя, не увидит изменение до часа, если профиль закеширован. В зависимости от требований безопасности может быть оправдан более короткий TTL или подход с событийной инвалидацией. Это не является блокером для данного PR, но должно быть отслежено как последующая задача.",
        words: [
          {
            id: "b2e-pr-cache-layer:w2",
            w: "detect",
            ru: "обнаруживать, выявлять",
            gloss: "to discover or identify the presence of something",
            ipa: "/dɪˈtekt/",
            pos: "verb",
            example: "The monitor failed to detect the cache stampede in staging.",
          },
        ],
      },
      {
        en: "mkowalski: One more item: there are no metrics being emitted for cache hit rate, miss rate, or eviction count. Without these signals, it will not be possible to assess the effectiveness of the cache in production or to detect degradation. Please add at least hit/miss counters to the existing Prometheus instrumentation before this is approved.",
        ru: "mkowalski: Ещё один пункт: не публикуются метрики коэффициента попаданий в кеш, промахов или количества вытеснений. Без этих сигналов не представится возможным оценить эффективность кеша в продакшене или обнаружить деградацию. Пожалуйста, добавьте как минимум счётчики попаданий/промахов к существующей Prometheus-инструментации до одобрения.",
      },
    ],
    phrases: [
      {
        id: "b2e-pr-cache-layer:p1",
        en: "good catch",
        ru: "хорошее замечание / верно подмечено",
        note: { en: "Used when acknowledging that a reviewer found a real bug or gap.", ru: "Используется для признания того, что ревьюер нашёл реальную ошибку или пробел." },
      },
      {
        id: "b2e-pr-cache-layer:p2",
        en: "not a blocker for this PR",
        ru: "не блокер для данного PR",
        note: { en: "Signals that an issue is noted but does not prevent merging.", ru: "Указывает, что проблема отмечена, но не препятствует слиянию." },
      },
      {
        id: "b2e-pr-cache-layer:p3",
        en: "may be warranted",
        ru: "может быть оправдан/о",
        note: { en: "Hedging phrase suggesting an alternative without mandating it.", ru: "Хеджирующая фраза, предлагающая альтернативу без обязательного требования." },
      },
    ],
    questions: [
      {
        id: "b2e-pr-cache-layer:q1",
        q: { en: "What cache invalidation problem did the reviewer identify?", ru: "Какую проблему инвалидации кеша выявил ревьюер?" },
        options: [
          { en: "The cache TTL was set too low", ru: "TTL кеша был установлен слишком низко" },
          { en: "The profile update handler did not delete the cache entry after a write", ru: "Обработчик обновления профиля не удалял запись кеша после записи" },
          { en: "The cache key format was not unique across tenants", ru: "Формат ключа кеша не был уникальным для разных арендаторов" },
        ],
        answer: 1,
        explain: {
          en: "The reviewer noted that cache.delete(key) was absent from the update path, which would serve stale data until TTL expiry.",
          ru: "Ревьюер отметил, что вызов cache.delete(key) отсутствовал в пути обновления, что приводило к отдаче устаревших данных до истечения TTL.",
        },
      },
      {
        id: "b2e-pr-cache-layer:q2",
        q: { en: "Why might the 3600-second TTL be a security concern?", ru: "Почему TTL в 3600 секунд может быть проблемой безопасности?" },
        options: [
          { en: "It causes Redis memory pressure under high load", ru: "Это создаёт давление на память Redis при высокой нагрузке" },
          { en: "A revoked user's access might still be served from cache for up to an hour", ru: "Доступ отозванного пользователя может отдаваться из кеша до часа" },
          { en: "The TTL is longer than the database connection timeout", ru: "TTL длиннее таймаута соединения с базой данных" },
          { en: "Redis does not support TTLs above 1800 seconds", ru: "Redis не поддерживает TTL более 1800 секунд" },
        ],
        answer: 1,
        explain: {
          en: "If an admin revokes access, the cache would continue serving the stale (still-permitted) profile for up to one hour.",
          ru: "Если администратор отзовёт доступ, кеш будет продолжать отдавать устаревший (по-прежнему разрешённый) профиль до одного часа.",
        },
      },
      {
        id: "b2e-pr-cache-layer:q3",
        q: { en: "What must the author add before the PR can be approved?", ru: "Что автор должен добавить до одобрения PR?" },
        options: [
          { en: "Unit tests for the cache invalidation logic", ru: "Юнит-тесты для логики инвалидации кеша" },
          { en: "A Redis cluster failover mechanism", ru: "Механизм аварийного переключения Redis-кластера" },
          { en: "Prometheus metrics for cache hit and miss rates", ru: "Метрики Prometheus для коэффициентов попаданий и промахов в кеш" },
        ],
        answer: 2,
        explain: {
          en: "The reviewer explicitly required hit/miss counters in the existing Prometheus instrumentation as a condition for approval.",
          ru: "Ревьюер явно потребовал счётчики попаданий/промахов в существующей Prometheus-инструментации как условие одобрения.",
        },
      },
    ],
    targetWords: ["ngsl:2022", "ngsl:2143", "ngsl:2224", "ngsl:2343", "ngsl:2410", "ngsl:2252"],
  },

  // ── 4. Architecture Decision Record (ADR) ──────────────────────────────────
  {
    id: "b2e-adr-event-sourcing",
    level: "B2",
    stream: "engineering",
    title: {
      en: "ADR-019: Adopt Event Sourcing for the Orders Bounded Context",
      ru: "ADR-019: Применение Event Sourcing для ограниченного контекста заказов",
    },
    blurb: {
      en: "An architecture decision record documenting the decision to replace the current mutable-state orders table with an event-sourced append-only log, including the forces, decision, and consequences.",
      ru: "Запись об архитектурном решении, документирующая решение заменить текущую таблицу заказов с изменяемым состоянием на журнал только-для-добавления на основе Event Sourcing, включая движущие силы, решение и последствия.",
    },
    source: { en: "Architecture Decision Record (ADR)", ru: "Запись об архитектурном решении (ADR)" },
    passages: [
      {
        en: "Status: Accepted — 2026-03-10. Deciders: Platform team lead, two senior engineers, product architect. Context: The orders service currently maintains a single mutable row per order in a relational database. Audit requirements introduced in Q1 2026 mandate that a full history of state transitions be retained for at least seven years.",
        ru: "Статус: Принято — 10 марта 2026. Принимающие решение: Технический руководитель платформы, два старших инженера, архитектор продукта. Контекст: Сервис заказов в настоящее время хранит одну изменяемую строку на заказ в реляционной базе данных. Требования к аудиту, введённые в Q1 2026, обязывают хранить полную историю переходов состояний не менее семи лет.",
        words: [
          {
            id: "b2e-adr-event-sourcing:w1",
            w: "architecture",
            ru: "архитектура",
            gloss: "the high-level structure of a software system",
            ipa: "/ˈɑː.kɪ.tek.tʃər/",
            pos: "noun",
            example: "The event-sourcing architecture was chosen for its auditability.",
          },
        ],
      },
      {
        en: "Forces: Retrofitting audit logging onto the current schema would require either a shadow audit table (with synchronisation risk) or temporal table support, which is not available in our current Postgres version. Neither approach would make past order states easily reconstructable for debugging or replaying business logic.",
        ru: "Движущие силы: Добавление аудит-логирования к текущей схеме потребовало бы либо теневой таблицы аудита (с риском рассинхронизации), либо поддержки временных таблиц, которая недоступна в нашей текущей версии Postgres. Ни один из подходов не позволил бы легко восстанавливать прошлые состояния заказов для отладки или воспроизведения бизнес-логики.",
      },
      {
        en: "Decision: The orders bounded context will be migrated to an event-sourced model. Domain events (OrderPlaced, OrderConfirmed, OrderShipped, OrderCancelled) will be appended to an immutable event log stored in Postgres using the orders_events table. The current mutable orders table will be replaced by a read-model projection that is rebuilt by replaying the event stream.",
        ru: "Решение: Ограниченный контекст заказов будет перенесён на модель Event Sourcing. Доменные события (OrderPlaced, OrderConfirmed, OrderShipped, OrderCancelled) будут добавляться в неизменяемый журнал событий, хранимый в Postgres в таблице orders_events. Текущая изменяемая таблица orders будет заменена проекцией модели чтения, восстанавливаемой воспроизведением потока событий.",
        words: [
          {
            id: "b2e-adr-event-sourcing:w2",
            w: "stream",
            ru: "поток",
            gloss: "a continuous sequence of data elements or events",
            ipa: "/striːm/",
            pos: "noun",
            example: "The read model is rebuilt by replaying the event stream from position zero.",
          },
        ],
      },
      {
        en: "Consequences — positive: The full audit trail is a natural by-product of the model. Debugging complex order state issues becomes possible by replaying events up to any point in time. New projections can be derived from the same event log without modifying the write path.",
        ru: "Последствия — положительные: Полный журнал аудита является естественным побочным продуктом модели. Отладка сложных проблем состояния заказов становится возможной путём воспроизведения событий до любого момента времени. Новые проекции могут быть получены из того же журнала событий без изменения пути записи.",
      },
      {
        en: "Consequences — negative and risks: Event sourcing introduces significant accidental complexity that must be managed. Schema evolution for past events is constrained — upcasters will be required for any changes to event structure. The team will need to invest in tooling for snapshot support to avoid prohibitively slow projection rebuilds as the event log grows. It is expected that onboarding time for engineers unfamiliar with the pattern will increase.",
        ru: "Последствия — отрицательные и риски: Event Sourcing вносит значительную случайную сложность, которую необходимо контролировать. Эволюция схемы прошлых событий ограничена — для любых изменений структуры событий потребуются апкастеры. Команде нужно будет инвестировать в инструментарий для поддержки снимков, чтобы избежать недопустимо медленного перестроения проекций по мере роста журнала событий. Ожидается, что время адаптации инженеров, незнакомых с паттерном, увеличится.",
      },
    ],
    phrases: [
      {
        id: "b2e-adr-event-sourcing:p1",
        en: "bounded context",
        ru: "ограниченный контекст",
        note: { en: "DDD term for a subsystem with its own model and language boundary.", ru: "Термин DDD для подсистемы с собственной моделью и границей языка." },
      },
      {
        id: "b2e-adr-event-sourcing:p2",
        en: "natural by-product",
        ru: "естественный побочный продукт",
        note: { en: "Something useful that arises from a design without extra effort.", ru: "Нечто полезное, возникающее из дизайна без дополнительных усилий." },
      },
      {
        id: "b2e-adr-event-sourcing:p3",
        en: "accidental complexity",
        ru: "случайная сложность",
        note: { en: "Complexity introduced by the chosen solution, not by the problem itself.", ru: "Сложность, внесённая выбранным решением, а не самой задачей." },
      },
      {
        id: "b2e-adr-event-sourcing:p4",
        en: "will be required",
        ru: "потребуются / будут необходимы",
        note: { en: "Passive future modal in engineering documents expressing obligation.", ru: "Пассивный будущий модальный оборот в технических документах, выражающий обязательность." },
      },
    ],
    questions: [
      {
        id: "b2e-adr-event-sourcing:q1",
        q: { en: "What business requirement made the current mutable-row approach inadequate?", ru: "Какое бизнес-требование сделало текущий подход с изменяемой строкой недостаточным?" },
        options: [
          { en: "The need to support multi-region deployments", ru: "Необходимость поддержки мультирегиональных развёртываний" },
          { en: "Audit requirements mandating a seven-year state transition history", ru: "Требования к аудиту, обязывающие хранить историю переходов состояний семь лет" },
          { en: "Performance problems caused by table lock contention", ru: "Проблемы производительности из-за конкуренции за блокировки таблиц" },
        ],
        answer: 1,
        explain: {
          en: "The ADR context explicitly states that Q1 2026 audit requirements mandate a full history for seven years, which the mutable-row model cannot satisfy.",
          ru: "Контекст ADR явно указывает, что требования к аудиту Q1 2026 обязывают хранить полную историю семь лет, что модель изменяемой строки не может обеспечить.",
        },
      },
      {
        id: "b2e-adr-event-sourcing:q2",
        q: { en: "What does the ADR say about adding new projections in the future?", ru: "Что говорит ADR о добавлении новых проекций в будущем?" },
        options: [
          { en: "New projections require modifying the event log schema", ru: "Новые проекции требуют изменения схемы журнала событий" },
          { en: "New projections can be derived without changing the write path", ru: "Новые проекции могут быть получены без изменения пути записи" },
          { en: "New projections are out of scope for this ADR", ru: "Новые проекции выходят за рамки данного ADR" },
        ],
        answer: 1,
        explain: {
          en: "The positive consequences section states that new projections can be derived from the same event log without modifying the write path.",
          ru: "Раздел положительных последствий указывает, что новые проекции могут быть получены из того же журнала событий без изменения пути записи.",
        },
      },
      {
        id: "b2e-adr-event-sourcing:q3",
        q: { en: "What technical challenge is mentioned regarding a growing event log?", ru: "Какая техническая проблема упоминается в связи с растущим журналом событий?" },
        options: [
          { en: "Storage costs exceeding the database budget", ru: "Затраты на хранение, превышающие бюджет базы данных" },
          { en: "Prohibitively slow projection rebuilds without snapshot support", ru: "Недопустимо медленное перестроение проекций без поддержки снимков" },
          { en: "Increased event ordering conflicts under concurrent writes", ru: "Учащающиеся конфликты порядка событий при конкурентных записях" },
        ],
        answer: 1,
        explain: {
          en: "The ADR warns that projection rebuilds slow down as the event log grows, requiring investment in snapshot tooling.",
          ru: "ADR предупреждает, что перестроение проекций замедляется по мере роста журнала событий, требуя инвестиций в инструментарий снимков.",
        },
      },
    ],
    targetWords: ["ngsl:2425", "ngsl:2146", "ngsl:2022", "ngsl:2143", "ngsl:2277", "ngsl:2049"],
  },

  // ── 5. On-call runbook ──────────────────────────────────────────────────────
  {
    id: "b2e-runbook-queue-backlog",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Runbook: Message Queue Consumer Lag Alert — SOP-Q-003",
      ru: "Runbook: Оповещение об отставании консьюмера очереди сообщений — SOP-Q-003",
    },
    blurb: {
      en: "Step-by-step on-call procedure for responding to a PagerDuty alert when the Kafka consumer lag on the notifications topic exceeds the critical threshold, including diagnostic commands and escalation criteria.",
      ru: "Пошаговая процедура дежурства для реагирования на оповещение PagerDuty, когда отставание консьюмера Kafka по топику уведомлений превышает критический порог, включая диагностические команды и критерии эскалации.",
    },
    source: { en: "On-call runbook", ru: "Дежурный runbook" },
    passages: [
      {
        en: "Alert: kafka.consumer.lag greater than 50000 sustained for 5 minutes on topic notifications. This alert should be treated as P2 (customer impact possible) unless lag exceeds 200,000 messages, in which case it is to be escalated to P1 immediately.",
        ru: "Оповещение: отставание kafka.consumer.lag более 50000 устойчиво на протяжении 5 минут по топику notifications. Данное оповещение следует рассматривать как P2 (возможно влияние на клиентов), если только отставание не превысит 200 000 сообщений, в этом случае оно должно быть немедленно эскалировано до P1.",
        words: [
          {
            id: "b2e-runbook-queue-backlog:w1",
            w: "mode",
            ru: "режим",
            gloss: "a particular operating state or configuration of a system",
            ipa: "/moʊd/",
            pos: "noun",
            example: "The consumer entered a slow-processing mode after the GC pause.",
          },
        ],
      },
      {
        en: "Step 1 — Confirm the alert is genuine. Run kafka-consumer-groups.sh --describe --group notifications-consumer and verify that lag is increasing, not merely a transient measurement artefact. It should be noted that Kafka lag metrics may lag behind by up to 30 seconds due to metrics scrape intervals.",
        ru: "Шаг 1 — Подтвердить подлинность оповещения. Выполните kafka-consumer-groups.sh --describe --group notifications-consumer и убедитесь, что отставание растёт, а не является лишь временным артефактом измерения. Следует отметить, что метрики отставания Kafka могут запаздывать до 30 секунд из-за интервалов сбора метрик.",
      },
      {
        en: "Step 2 — Check consumer health. Inspect the consumer pod logs using kubectl logs -l app=notifications-consumer --since=10m. Restarting crash-loops, high GC pause durations (greater than 500 ms), or repeated CommitFailedException entries are all indicators that the consumer is under abnormal load or is suffering from a processing error.",
        ru: "Шаг 2 — Проверить состояние консьюмера. Изучите логи пода консьюмера с помощью kubectl logs -l app=notifications-consumer --since=10m. Перезапуски из-за сбоев, высокая длительность пауз GC (более 500 мс) или повторяющиеся записи CommitFailedException — всё это признаки того, что консьюмер испытывает аномальную нагрузку или страдает от ошибки обработки.",
        words: [
          {
            id: "b2e-runbook-queue-backlog:w2",
            w: "log",
            ru: "журнал, лог",
            gloss: "a recorded sequence of system events or messages",
            ipa: "/lɒɡ/",
            pos: "noun",
            example: "The consumer logs revealed a repeated deserialization error.",
          },
        ],
      },
      {
        en: "Step 3 — Scale up if the consumer is healthy. If no errors are found in the logs and the consumer appears to be processing normally but slowly, it is likely that the lag is caused by a producer throughput spike. In that case, the consumer replica count should be increased: kubectl scale deployment notifications-consumer --replicas=6. Monitor lag for 5 minutes after scaling.",
        ru: "Шаг 3 — Масштабировать при исправности консьюмера. Если в логах не обнаружено ошибок и консьюмер, по всей видимости, обрабатывает нормально, но медленно, отставание, скорее всего, вызвано всплеском пропускной способности продьюсера. В этом случае следует увеличить количество реплик консьюмера: kubectl scale deployment notifications-consumer --replicas=6. Мониторьте отставание 5 минут после масштабирования.",
      },
      {
        en: "Step 4 — Escalate if lag is not recovering. If lag continues to grow after scaling, or if a poison-pill message is suspected (indicated by a single partition with disproportionately high lag while others are healthy), page the on-call engineer from the Platform team and open a war-room channel. Do not attempt to skip or delete messages without explicit approval from the Platform team lead.",
        ru: "Шаг 4 — Эскалировать, если отставание не восстанавливается. Если отставание продолжает расти после масштабирования или если подозревается сообщение-отравитель (что указывает одна партиция с непропорционально высоким отставанием при исправности остальных), позвоните дежурному инженеру из команды Platform и откройте канал war-room. Не пытайтесь пропустить или удалить сообщения без явного одобрения технического руководителя Platform.",
      },
    ],
    phrases: [
      {
        id: "b2e-runbook-queue-backlog:p1",
        en: "is to be escalated",
        ru: "должно быть эскалировано",
        note: { en: "Passive obligatory construction common in runbooks and SOPs.", ru: "Пассивная обязательная конструкция, распространённая в runbook и SOP." },
      },
      {
        id: "b2e-runbook-queue-backlog:p2",
        en: "poison-pill message",
        ru: "сообщение-отравитель",
        note: { en: "A message that consistently causes consumer errors when processed.", ru: "Сообщение, которое постоянно вызывает ошибки консьюмера при обработке." },
      },
      {
        id: "b2e-runbook-queue-backlog:p3",
        en: "it is likely that",
        ru: "вероятно, что / скорее всего",
        note: { en: "Hedging phrase signalling a probabilistic diagnosis, not a certainty.", ru: "Хеджирующая фраза, сигнализирующая о вероятностном диагнозе, а не о достоверности." },
      },
    ],
    questions: [
      {
        id: "b2e-runbook-queue-backlog:q1",
        q: { en: "At what consumer lag level should the alert be escalated from P2 to P1?", ru: "При каком уровне отставания консьюмера оповещение следует эскалировать с P2 до P1?" },
        options: [
          { en: "50,000 messages", ru: "50 000 сообщений" },
          { en: "100,000 messages", ru: "100 000 сообщений" },
          { en: "200,000 messages", ru: "200 000 сообщений" },
          { en: "500,000 messages", ru: "500 000 сообщений" },
        ],
        answer: 2,
        explain: {
          en: "The runbook states that if lag exceeds 200,000 messages, the alert is to be escalated to P1 immediately.",
          ru: "Runbook указывает, что если отставание превышает 200 000 сообщений, оповещение должно быть немедленно эскалировано до P1.",
        },
      },
      {
        id: "b2e-runbook-queue-backlog:q2",
        q: { en: "What does the runbook suggest if the consumer logs show no errors but lag is growing?", ru: "Что предлагает runbook, если в логах консьюмера нет ошибок, но отставание растёт?" },
        options: [
          { en: "Restart all consumer pods immediately", ru: "Немедленно перезапустить все поды консьюмера" },
          { en: "Increase the consumer replica count", ru: "Увеличить количество реплик консьюмера" },
          { en: "Delete the Kafka topic and recreate it", ru: "Удалить топик Kafka и пересоздать его" },
        ],
        answer: 1,
        explain: {
          en: "Step 3 recommends scaling the consumer to 6 replicas when the consumer is healthy but lag is growing, indicating a producer throughput spike.",
          ru: "Шаг 3 рекомендует масштабирование консьюмера до 6 реплик, когда консьюмер исправен, но отставание растёт, что указывает на всплеск пропускной способности продьюсера.",
        },
      },
      {
        id: "b2e-runbook-queue-backlog:q3",
        q: { en: "What is the sign that a poison-pill message may be causing the lag?", ru: "Каков признак того, что сообщение-отравитель может вызывать отставание?" },
        options: [
          { en: "All partitions show equally high lag", ru: "Все партиции показывают одинаково высокое отставание" },
          { en: "The consumer pod is in a CrashLoopBackOff state", ru: "Под консьюмера находится в состоянии CrashLoopBackOff" },
          { en: "One partition has disproportionately high lag while others are healthy", ru: "Одна партиция имеет непропорционально высокое отставание, тогда как остальные исправны" },
        ],
        answer: 2,
        explain: {
          en: "A single partition stuck at high lag while neighbouring partitions are healthy is a classic indicator of a poison-pill message stuck in processing.",
          ru: "Одна партиция с высоким отставанием при исправности соседних — классический признак застрявшего в обработке сообщения-отравителя.",
        },
      },
    ],
    targetWords: ["ngsl:2224", "ngsl:2202", "ngsl:2343", "ngsl:2277", "ngsl:2327", "ngsl:2368"],
  },

  // ── 6. Performance investigation writeup ───────────────────────────────────
  {
    id: "b2e-perf-n-plus-one",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Performance Investigation: N+1 Query Regression in the Orders API — Ticket PERF-418",
      ru: "Исследование производительности: Регрессия N+1-запроса в Orders API — Задача PERF-418",
    },
    blurb: {
      en: "An investigation report documenting the discovery and resolution of an N+1 query problem that was introduced by a seemingly innocent refactor in the orders list endpoint, causing a 12x increase in database queries per request.",
      ru: "Отчёт об исследовании, документирующий обнаружение и устранение проблемы N+1-запроса, введённой внешне безобидным рефактором в эндпоинт списка заказов, что вызвало 12-кратное увеличение запросов к базе данных на один запрос.",
    },
    source: { en: "Performance investigation writeup", ru: "Отчёт об исследовании производительности" },
    passages: [
      {
        en: "The orders list endpoint (GET /api/orders) was reported to exhibit significantly degraded response times following the deployment of release 2.31.0 on 2026-04-22. The p95 latency was observed to have increased from approximately 45 ms to 540 ms under normal load. The regression was not detected by the staging environment because the staging dataset contains fewer than 50 orders per user, whereas production accounts may hold up to 600.",
        ru: "Сообщалось, что эндпоинт списка заказов (GET /api/orders) демонстрирует значительно ухудшенное время отклика после развёртывания релиза 2.31.0 22 апреля 2026 года. Было замечено, что задержка p95 увеличилась приблизительно с 45 мс до 540 мс при нормальной нагрузке. Регрессия не была обнаружена в staging-среде, поскольку датасет staging содержит менее 50 заказов на пользователя, тогда как производственные аккаунты могут содержать до 600.",
        words: [
          {
            id: "b2e-perf-n-plus-one:w1",
            w: "efficiency",
            ru: "эффективность",
            gloss: "the ability to accomplish a task with minimal wasted resources",
            ipa: "/ɪˈfɪʃ.ən.si/",
            pos: "noun",
            example: "The fix improved query efficiency by reducing round-trips from N+1 to 2.",
          },
        ],
      },
      {
        en: "To isolate the cause, SQL query logs were captured during a simulated request to the endpoint. It was found that a single request for a list of 12 orders was generating 13 database round-trips: one query to fetch the order list and one additional query per order to fetch the associated customer record. This is the classical N+1 query pattern.",
        ru: "Для выявления причины в ходе симулированного запроса к эндпоинту были захвачены логи SQL-запросов. Было установлено, что один запрос списка 12 заказов генерирует 13 обращений к базе данных: один запрос для получения списка заказов и один дополнительный запрос на каждый заказ для получения связанной записи клиента. Это классический паттерн N+1-запроса.",
      },
      {
        en: "The root cause was traced to commit a3f87d2, where the CustomerRepository.findById() call was moved from a batch lookup into the loop that maps order rows to response DTOs. This change might have appeared harmless in isolation, but under a list response with many rows, it results in linear database scaling with respect to the number of items returned.",
        ru: "Первопричина была отслежена до коммита a3f87d2, в котором вызов CustomerRepository.findById() был перемещён из пакетного поиска в цикл, сопоставляющий строки заказов с DTO ответа. Это изменение могло казаться безобидным в отдельности, но при ответе со списком, содержащим много строк, оно приводит к линейному масштабированию обращений к базе данных относительно количества возвращаемых элементов.",
        words: [
          {
            id: "b2e-perf-n-plus-one:w2",
            w: "parallel",
            ru: "параллельный",
            gloss: "occurring simultaneously or structured side-by-side",
            ipa: "/ˈpær.ə.lel/",
            pos: "adj",
            example: "Parallel batch fetching replaced the sequential per-row queries.",
          },
        ],
      },
      {
        en: "The fix was implemented by restoring a batch fetch: after the initial order list query, a single CustomerRepository.findByIds(orderIds) call is issued, and the results are indexed into a map by customer ID. The mapping loop then performs an O(1) hash-map lookup instead of a database call. This reduces the total query count from N+1 to exactly 2, regardless of list size.",
        ru: "Исправление было реализовано путём восстановления пакетной выборки: после первоначального запроса списка заказов выполняется один вызов CustomerRepository.findByIds(orderIds), и результаты индексируются в словарь по ID клиента. Цикл сопоставления затем выполняет поиск O(1) в хеш-таблице вместо обращения к базе данных. Это сокращает общее количество запросов с N+1 до ровно 2, независимо от размера списка.",
      },
      {
        en: "It is recommended that the team adopt a mandatory query-count assertion in integration tests for all list endpoints. A helper that wraps the test database connection and counts SQL statements should be introduced to the test utilities. Any test that observes more than 5 queries for a list of 10 items should be considered a failing test. This guard should prevent similar regressions from reaching production.",
        ru: "Рекомендуется, чтобы команда внедрила обязательное утверждение о количестве запросов в интеграционные тесты для всех эндпоинтов списков. В утилиты тестирования следует ввести вспомогательный объект, оборачивающий тестовое соединение с базой данных и считающий SQL-операторы. Любой тест, наблюдающий более 5 запросов для списка из 10 элементов, должен считаться проваленным. Эта защита должна предотвратить попадание аналогичных регрессий в продакшен.",
      },
    ],
    phrases: [
      {
        id: "b2e-perf-n-plus-one:p1",
        en: "was observed to have increased",
        ru: "было замечено, что возросло",
        note: { en: "Passive perfect construction for reporting measured changes.", ru: "Пассивная конструкция перфекта для сообщения об измеренных изменениях." },
      },
      {
        id: "b2e-perf-n-plus-one:p2",
        en: "in isolation",
        ru: "в отдельности / изолированно",
        note: { en: "Used when discussing behavior of a change outside its full context.", ru: "Используется при обсуждении поведения изменения вне его полного контекста." },
      },
      {
        id: "b2e-perf-n-plus-one:p3",
        en: "should be considered a failing test",
        ru: "следует считать провалившимся тестом",
        note: { en: "Engineering judgment phrased as a normative recommendation.", ru: "Инженерная оценка, сформулированная как нормативная рекомендация." },
      },
    ],
    questions: [
      {
        id: "b2e-perf-n-plus-one:q1",
        q: { en: "Why was the N+1 regression not caught in the staging environment?", ru: "Почему регрессия N+1 не была обнаружена в staging-среде?" },
        options: [
          { en: "Staging does not run SQL query logging", ru: "Staging не ведёт логирование SQL-запросов" },
          { en: "Staging has fewer orders per user than production", ru: "В staging меньше заказов на пользователя, чем в продакшене" },
          { en: "The regression only appeared under concurrent load", ru: "Регрессия проявлялась только при конкурентной нагрузке" },
        ],
        answer: 1,
        explain: {
          en: "Staging datasets had fewer than 50 orders per user, so the extra queries were negligible; production accounts can have up to 600.",
          ru: "Датасеты staging содержали менее 50 заказов на пользователя, поэтому дополнительные запросы были незначительны; производственные аккаунты могут иметь до 600.",
        },
      },
      {
        id: "b2e-perf-n-plus-one:q2",
        q: { en: "How many database round-trips does the fixed implementation use for a list of any size?", ru: "Сколько обращений к базе данных использует исправленная реализация для списка любого размера?" },
        options: [
          { en: "One query", ru: "Один запрос" },
          { en: "Exactly two queries", ru: "Ровно два запроса" },
          { en: "N+1 queries, but batched", ru: "N+1 запросов, но пакетных" },
          { en: "It depends on the cache hit rate", ru: "Зависит от коэффициента попаданий в кеш" },
        ],
        answer: 1,
        explain: {
          en: "The fix uses one query for the order list and one batch query for all customer IDs, totalling exactly 2 regardless of N.",
          ru: "Исправление использует один запрос для списка заказов и один пакетный запрос для всех ID клиентов, что в сумме составляет ровно 2 независимо от N.",
        },
      },
      {
        id: "b2e-perf-n-plus-one:q3",
        q: { en: "What preventive measure is recommended to avoid similar regressions?", ru: "Какая превентивная мера рекомендуется для предотвращения аналогичных регрессий?" },
        options: [
          { en: "Adding an ORM-level query cache", ru: "Добавление кеша запросов на уровне ORM" },
          { en: "Deploying a read replica for the orders service", ru: "Развёртывание реплики чтения для сервиса заказов" },
          { en: "Mandatory query-count assertions in integration tests for list endpoints", ru: "Обязательные утверждения о количестве запросов в интеграционных тестах для эндпоинтов списков" },
        ],
        answer: 2,
        explain: {
          en: "The report recommends a query-counting helper in tests that fails if more than 5 queries are observed for a 10-item list.",
          ru: "Отчёт рекомендует вспомогательный объект для подсчёта запросов в тестах, который проваливает тест при наблюдении более 5 запросов для списка из 10 элементов.",
        },
      },
    ],
    targetWords: ["ngsl:2252", "ngsl:2143", "ngsl:2224", "ngsl:2277", "ngsl:2045", "ngsl:2343"],
  },

  // ── 7. Deprecation notice / migration guide ────────────────────────────────
  {
    id: "b2e-deprecation-v2-auth",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Deprecation Notice: Legacy v1 Authentication API — Sunset Date 2026-09-01",
      ru: "Уведомление об устаревании: Устаревший API аутентификации v1 — Дата завершения 2026-09-01",
    },
    blurb: {
      en: "A deprecation and migration notice informing API consumers that the v1 session-cookie authentication endpoints will be decommissioned, with a migration path to the v2 OAuth 2.0 / JWT-based API.",
      ru: "Уведомление об устаревании и миграции, информирующее потребителей API о том, что эндпоинты аутентификации на основе сессионных куки v1 будут выведены из эксплуатации, с путём миграции к API на основе OAuth 2.0 / JWT v2.",
    },
    source: { en: "Deprecation notice / migration guide", ru: "Уведомление об устаревании / руководство по миграции" },
    passages: [
      {
        en: "Effective 2026-09-01, all endpoints under /api/v1/auth/ will be decommissioned. Requests to these endpoints will return HTTP 410 Gone. Consumers are required to migrate to the v2 authentication API at /api/v2/auth/ before this date. The v1 API has been in maintenance mode since 2025-01-01 and no further bug fixes will be issued against it.",
        ru: "С 1 сентября 2026 года все эндпоинты по пути /api/v1/auth/ будут выведены из эксплуатации. Запросы к этим эндпоинтам будут возвращать HTTP 410 Gone. Потребители обязаны перейти на API аутентификации v2 по адресу /api/v2/auth/ до этой даты. API v1 находился в режиме обслуживания с 1 января 2025 года, и никаких дальнейших исправлений ошибок для него выпускаться не будет.",
        words: [
          {
            id: "b2e-deprecation-v2-auth:w1",
            w: "platform",
            ru: "платформа",
            gloss: "a foundational software environment on which other services are built",
            ipa: "/ˈplæt.fɔːm/",
            pos: "noun",
            example: "The platform team owns the v2 authentication layer.",
          },
        ],
      },
      {
        en: "The primary difference between v1 and v2 is the authentication mechanism. In v1, a successful login call returns a Set-Cookie header containing a signed session token. In v2, the /api/v2/auth/token endpoint returns a JSON response containing a short-lived JWT access token (expiry: 15 minutes) and a long-lived refresh token (expiry: 30 days). The access token should be passed as a Bearer token in the Authorization header on subsequent requests.",
        ru: "Основное различие между v1 и v2 — механизм аутентификации. В v1 успешный вызов входа возвращает заголовок Set-Cookie, содержащий подписанный токен сессии. В v2 эндпоинт /api/v2/auth/token возвращает JSON-ответ с кратко-живущим JWT-токеном доступа (срок: 15 минут) и долго-живущим токеном обновления (срок: 30 дней). Токен доступа следует передавать как Bearer-токен в заголовке Authorization при последующих запросах.",
      },
      {
        en: "Consumers who maintain long-lived server-to-server integrations should be aware that the refresh token flow must be implemented to avoid repeated full re-authentication. A refresh token can be exchanged for a new access token via POST /api/v2/auth/refresh. It is expected that refresh tokens be stored securely and treated as sensitive credentials.",
        ru: "Потребителям, поддерживающим долгосрочные интеграции сервер-сервер, следует знать, что поток токена обновления должен быть реализован во избежание повторной полной аутентификации. Токен обновления можно обменять на новый токен доступа через POST /api/v2/auth/refresh. Ожидается, что токены обновления будут храниться безопасно и рассматриваться как конфиденциальные учётные данные.",
        words: [
          {
            id: "b2e-deprecation-v2-auth:w2",
            w: "permission",
            ru: "разрешение, право доступа",
            gloss: "authorization granted to access a resource or perform an action",
            ipa: "/pəˈmɪʃ.ən/",
            pos: "noun",
            example: "The v2 token includes a permissions claim listing allowed scopes.",
          },
        ],
      },
      {
        en: "To assist with the migration, a compatibility shim is available as an opt-in feature flag (AUTH_V2_COMPAT_SHIM=true). When enabled, the shim intercepts v1-style cookie headers on incoming requests and transparently exchanges them for v2 JWTs before forwarding to the application. This shim is intended as a short-term bridge only and will be removed alongside the v1 endpoints on the sunset date.",
        ru: "Для содействия миграции в качестве опционального флага функционала доступна прослойка совместимости (AUTH_V2_COMPAT_SHIM=true). При включении прослойка перехватывает заголовки куки в стиле v1 во входящих запросах и прозрачно обменивает их на JWT v2 перед передачей в приложение. Эта прослойка предназначена только как краткосрочный мост и будет удалена вместе с эндпоинтами v1 в дату завершения.",
      },
      {
        en: "Teams that require an extension of the sunset deadline must submit a written justification to the Platform team no later than 2026-07-01. Extension requests will be considered on a case-by-case basis and are unlikely to be granted beyond 2026-10-01 under any circumstances. All teams are strongly encouraged to begin migration planning in the current sprint.",
        ru: "Команды, которым требуется продление срока завершения, должны подать письменное обоснование в команду Platform не позднее 1 июля 2026 года. Запросы на продление будут рассматриваться в индивидуальном порядке и вряд ли будут одобрены позднее 1 октября 2026 года ни при каких обстоятельствах. Всем командам настоятельно рекомендуется начать планирование миграции в текущем спринте.",
      },
    ],
    phrases: [
      {
        id: "b2e-deprecation-v2-auth:p1",
        en: "in maintenance mode",
        ru: "в режиме обслуживания",
        note: { en: "Describes a product that receives only critical fixes, not new features.", ru: "Описывает продукт, получающий только критические исправления, а не новые функции." },
      },
      {
        id: "b2e-deprecation-v2-auth:p2",
        en: "on a case-by-case basis",
        ru: "в индивидуальном порядке",
        note: { en: "Each situation is evaluated separately rather than by a general rule.", ru: "Каждая ситуация оценивается индивидуально, а не по общему правилу." },
      },
      {
        id: "b2e-deprecation-v2-auth:p3",
        en: "are unlikely to be granted",
        ru: "вряд ли будут одобрены",
        note: { en: "Passive hedge expressing low probability of approval.", ru: "Пассивный хедж, выражающий низкую вероятность одобрения." },
      },
    ],
    questions: [
      {
        id: "b2e-deprecation-v2-auth:q1",
        q: { en: "What HTTP status will v1 auth endpoints return after the sunset date?", ru: "Какой HTTP-статус будут возвращать эндпоинты аутентификации v1 после даты завершения?" },
        options: [
          { en: "HTTP 404 Not Found", ru: "HTTP 404 Not Found" },
          { en: "HTTP 410 Gone", ru: "HTTP 410 Gone" },
          { en: "HTTP 301 Moved Permanently", ru: "HTTP 301 Moved Permanently" },
          { en: "HTTP 503 Service Unavailable", ru: "HTTP 503 Service Unavailable" },
        ],
        answer: 1,
        explain: {
          en: "The notice explicitly states that decommissioned v1 endpoints will return HTTP 410 Gone.",
          ru: "Уведомление явно указывает, что выведенные из эксплуатации эндпоинты v1 будут возвращать HTTP 410 Gone.",
        },
      },
      {
        id: "b2e-deprecation-v2-auth:q2",
        q: { en: "How long does a v2 access token remain valid?", ru: "Как долго действует токен доступа v2?" },
        options: [
          { en: "30 days", ru: "30 дней" },
          { en: "24 hours", ru: "24 часа" },
          { en: "15 minutes", ru: "15 минут" },
        ],
        answer: 2,
        explain: {
          en: "The notice states the JWT access token has an expiry of 15 minutes; the refresh token has a 30-day expiry.",
          ru: "Уведомление указывает, что JWT-токен доступа имеет срок истечения 15 минут; токен обновления — 30 дней.",
        },
      },
      {
        id: "b2e-deprecation-v2-auth:q3",
        q: { en: "What is the purpose of the AUTH_V2_COMPAT_SHIM feature flag?", ru: "Какова цель флага функционала AUTH_V2_COMPAT_SHIM?" },
        options: [
          { en: "To permanently support both v1 and v2 auth in parallel", ru: "Для постоянной параллельной поддержки аутентификации v1 и v2" },
          { en: "To intercept v1 cookie headers and exchange them for v2 JWTs as a migration bridge", ru: "Для перехвата заголовков куки v1 и обмена их на JWT v2 в качестве моста миграции" },
          { en: "To disable v1 auth endpoints ahead of the sunset date", ru: "Для отключения эндпоинтов аутентификации v1 до даты завершения" },
        ],
        answer: 1,
        explain: {
          en: "The shim is a short-term bridge that converts v1-style requests to v2 JWTs transparently; it is removed at the sunset date.",
          ru: "Прослойка является краткосрочным мостом, прозрачно конвертирующим запросы в стиле v1 в JWT v2; она удаляется в дату завершения.",
        },
      },
    ],
    targetWords: ["ngsl:2169", "ngsl:2412", "ngsl:2435", "ngsl:2184", "ngsl:2022", "ngsl:2049"],
  },

  // ── 8. Commit message + changelog ──────────────────────────────────────────
  {
    id: "b2e-changelog-tls",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Changelog: TLS 1.0/1.1 Removal and mTLS Enforcement — Release 3.8.0",
      ru: "Журнал изменений: Удаление TLS 1.0/1.1 и внедрение mTLS — Релиз 3.8.0",
    },
    blurb: {
      en: "The release notes and associated commit messages for a security-hardening release that drops support for TLS 1.0 and 1.1 and enforces mutual TLS for all internal service-to-service communication.",
      ru: "Примечания к релизу и связанные сообщения коммитов для релиза усиления безопасности, удаляющего поддержку TLS 1.0 и 1.1 и обязывающего использовать mTLS для всей внутренней межсервисной коммуникации.",
    },
    source: { en: "Commit message + changelog", ru: "Сообщение коммита + журнал изменений" },
    passages: [
      {
        en: "Release 3.8.0 — 2026-05-10. Breaking changes: TLS 1.0 and TLS 1.1 are no longer accepted by the API gateway, load balancer, or any internal service endpoint. Clients that have not been upgraded to TLS 1.2+ will be rejected with a handshake failure.",
        ru: "Релиз 3.8.0 — 10 мая 2026. Критические изменения: TLS 1.0 и TLS 1.1 более не принимаются API-шлюзом, балансировщиком нагрузки или каким-либо внутренним сервисным эндпоинтом. Клиенты, не перешедшие на TLS 1.2+, будут отклонены с ошибкой рукопожатия.",
        words: [
          {
            id: "b2e-changelog-tls:w1",
            w: "mutual",
            ru: "взаимный, двусторонний",
            gloss: "shared or experienced by both or all parties",
            ipa: "/ˈmjuː.tʃu.əl/",
            pos: "adj",
            example: "Mutual TLS requires both the client and server to present certificates.",
          },
        ],
      },
      {
        en: "Security improvements: Mutual TLS (mTLS) is now enforced for all east-west traffic between microservices. Service certificates are to be provisioned and rotated automatically by the Vault PKI secrets engine. Services that do not present a valid, CA-signed certificate will be refused connections by the sidecar proxy.",
        ru: "Улучшения безопасности: Mutual TLS (mTLS) теперь обязателен для всего east-west-трафика между микросервисами. Сертификаты сервисов будут автоматически выпускаться и ротироваться движком секретов Vault PKI. Сервисы, не предоставляющие действительный сертификат, подписанный CA, будут получать отказ в соединениях от sidecar-прокси.",
      },
      {
        en: "Commit: sec: drop TLS 1.0 and 1.1 across all service listeners. TLS 1.0 and 1.1 are considered cryptographically weak and have been deprecated by RFC 8996. This commit removes the corresponding protocol version constants from the shared tlsConfig helper and updates the accepted minimum version to tls.VersionTLS12 in all HTTP servers and gRPC listeners throughout the codebase.",
        ru: "Коммит: sec: drop TLS 1.0 and 1.1 across all service listeners. TLS 1.0 и 1.1 считаются криптографически слабыми и были устаревшими согласно RFC 8996. Этот коммит удаляет соответствующие константы версий протокола из общего вспомогательного объекта tlsConfig и обновляет принятую минимальную версию до tls.VersionTLS12 во всех HTTP-серверах и gRPC-слушателях во всей кодовой базе.",
        words: [
          {
            id: "b2e-changelog-tls:w2",
            w: "port",
            ru: "порт",
            gloss: "a numbered network endpoint that identifies a specific process or service",
            ipa: "/pɔːt/",
            pos: "noun",
            example: "All HTTPS listeners were migrated to port 443 with TLS 1.2 enforcement.",
          },
        ],
      },
      {
        en: "Migration notes: If your integration uses a language runtime or HTTP client library that defaults to TLS 1.0 or 1.1 negotiation, you should configure the client to explicitly specify a minimum TLS version of 1.2. This is known to affect Java runtimes older than JDK 8u261, Python ssl module builds linked against OpenSSL versions below 1.0.2, and legacy .NET Framework versions prior to 4.7.",
        ru: "Примечания по миграции: Если ваша интеграция использует среду выполнения языка или библиотеку HTTP-клиента, по умолчанию выполняющую согласование TLS 1.0 или 1.1, следует настроить клиент на явное указание минимальной версии TLS 1.2. Это известно как проблема для сред выполнения Java старше JDK 8u261, сборок модуля Python ssl, связанных с OpenSSL ниже версии 1.0.2, и устаревших версий .NET Framework до 4.7.",
      },
      {
        en: "Rollback plan: Rollback to 3.7.x is possible within a 48-hour window by reverting the tlsConfig commit and redeploying. It should be noted that rolling back would re-expose the known cryptographic weaknesses that this release is intended to address. Any rollback must be approved by the security team and treated as a temporary measure only.",
        ru: "План отката: Откат до 3.7.x возможен в течение 48-часового окна путём отмены коммита tlsConfig и повторного развёртывания. Следует отметить, что откат повторно откроет известные криптографические уязвимости, которые этот релиз призван устранить. Любой откат должен быть одобрен командой безопасности и рассматриваться исключительно как временная мера.",
      },
    ],
    phrases: [
      {
        id: "b2e-changelog-tls:p1",
        en: "are considered cryptographically weak",
        ru: "считаются криптографически слабыми",
        note: { en: "Passive construction used in security changelogs to state consensus.", ru: "Пассивная конструкция, используемая в журналах изменений безопасности для констатации консенсуса." },
      },
      {
        id: "b2e-changelog-tls:p2",
        en: "as a temporary measure only",
        ru: "исключительно как временная мера",
        note: { en: "Signals that a workaround must not become a permanent state.", ru: "Сигнализирует, что обходное решение не должно стать постоянным состоянием." },
      },
      {
        id: "b2e-changelog-tls:p3",
        en: "are no longer accepted",
        ru: "более не принимаются",
        note: { en: "Breaking-change phrasing for removed protocol or API support.", ru: "Формулировка критического изменения для удалённой поддержки протокола или API." },
      },
    ],
    questions: [
      {
        id: "b2e-changelog-tls:q1",
        q: { en: "What happens to a client that connects using TLS 1.1 after the 3.8.0 release?", ru: "Что происходит с клиентом, подключающимся по TLS 1.1 после релиза 3.8.0?" },
        options: [
          { en: "It is automatically upgraded to TLS 1.2", ru: "Оно автоматически обновляется до TLS 1.2" },
          { en: "It is rejected with a handshake failure", ru: "Оно отклоняется с ошибкой рукопожатия" },
          { en: "It is allowed but a deprecation warning is logged", ru: "Оно разрешается, но в лог записывается предупреждение об устаревании" },
        ],
        answer: 1,
        explain: {
          en: "The changelog states that clients not upgraded to TLS 1.2+ will be rejected with a handshake failure.",
          ru: "Журнал изменений указывает, что клиенты, не перешедшие на TLS 1.2+, будут отклонены с ошибкой рукопожатия.",
        },
      },
      {
        id: "b2e-changelog-tls:q2",
        q: { en: "How are mTLS service certificates provisioned and rotated?", ru: "Как выпускаются и ротируются сертификаты сервисов mTLS?" },
        options: [
          { en: "Manually by each service team on a 90-day schedule", ru: "Вручную каждой сервисной командой по 90-дневному расписанию" },
          { en: "Automatically by the Vault PKI secrets engine", ru: "Автоматически движком секретов Vault PKI" },
          { en: "By a shared certificate authority managed by the security team", ru: "Общим центром сертификации, управляемым командой безопасности" },
        ],
        answer: 1,
        explain: {
          en: "The changelog states that service certificates are to be provisioned and rotated automatically by the Vault PKI secrets engine.",
          ru: "Журнал изменений указывает, что сертификаты сервисов будут автоматически выпускаться и ротироваться движком секретов Vault PKI.",
        },
      },
      {
        id: "b2e-changelog-tls:q3",
        q: { en: "What must be obtained before a rollback to 3.7.x is permitted?", ru: "Что необходимо получить до разрешения отката на 3.7.x?" },
        options: [
          { en: "Approval from the engineering manager", ru: "Одобрение инженерного менеджера" },
          { en: "Approval from the security team", ru: "Одобрение команды безопасности" },
          { en: "A completed incident postmortem", ru: "Завершённый постмортем инцидента" },
          { en: "No approval is needed if done within 48 hours", ru: "Одобрение не требуется, если откат выполнен в течение 48 часов" },
        ],
        answer: 1,
        explain: {
          en: "The rollback plan states that any rollback must be approved by the security team, as it re-exposes known cryptographic weaknesses.",
          ru: "План отката указывает, что любой откат должен быть одобрен командой безопасности, так как он повторно открывает известные криптографические уязвимости.",
        },
      },
    ],
    targetWords: ["ngsl:2437", "ngsl:2054", "ngsl:2074", "ngsl:2036", "ngsl:2022", "ngsl:2019", "ngsl:2078"],
  },

  // ── 9. Capacity-planning memo ───────────────────────────────────────────────
  {
    id: "b2e-capacity-gpu",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Capacity Planning Memo: GPU Inference Cluster — Q3 2026",
      ru: "Памятная записка о планировании ёмкости: Кластер GPU-инференса — Q3 2026",
    },
    blurb: {
      en: "An internal capacity memo projecting GPU compute demand for the AI-powered search feature through Q3 2026, with recommendations for procurement, spot-instance strategy, and request-queue tuning.",
      ru: "Внутренняя записка о ёмкости, прогнозирующая потребность в GPU-вычислениях для функции поиска на основе ИИ на Q3 2026, с рекомендациями по закупкам, стратегии spot-инстансов и настройке очереди запросов.",
    },
    source: { en: "Capacity-planning memo", ru: "Памятная записка о планировании ёмкости" },
    passages: [
      {
        en: "To: Engineering leadership, Finance. From: Platform infrastructure team. Date: 2026-05-28. Subject: GPU capacity requirements — AI search feature, Q3 2026. This memo is intended to inform procurement decisions ahead of the Q3 planning cycle. Current GPU utilisation on the inference cluster is running at approximately 71% of provisioned capacity under median weekday traffic. It is projected that this figure will reach 95% by mid-August if no additional capacity is acquired.",
        ru: "Кому: Техническое руководство, Финансы. От: Команда инфраструктуры платформы. Дата: 28 мая 2026. Тема: Требования к ёмкости GPU — функция поиска на основе ИИ, Q3 2026. Эта записка предназначена для информирования решений о закупках до начала цикла планирования Q3. Текущая утилизация GPU в кластере инференса составляет приблизительно 71% от выделенной ёмкости при медианном трафике рабочего дня. Прогнозируется, что этот показатель достигнет 95% к середине августа при отсутствии дополнительной ёмкости.",
        words: [
          {
            id: "b2e-capacity-gpu:w1",
            w: "cloud",
            ru: "облако (облачные вычисления)",
            gloss: "remote computing infrastructure accessed over the internet",
            ipa: "/klaʊd/",
            pos: "noun",
            example: "The inference cluster runs on cloud GPUs provisioned via the vendor API.",
          },
        ],
      },
      {
        en: "The growth projection is derived from three inputs: the measured month-over-month growth rate of AI search feature adoption (18%), the planned onboarding of enterprise tier customers in July, and the scheduled A/B test of an expanded embedding model that is expected to require 40% more compute per inference call.",
        ru: "Прогноз роста основан на трёх входных данных: измеренном ежемесячном темпе роста принятия функции поиска на основе ИИ (18%), запланированном подключении клиентов корпоративного уровня в июле и запланированном A/B-тесте расширенной модели эмбеддингов, которая, по ожиданиям, потребует на 40% больше вычислений на один вызов инференса.",
        words: [
          {
            id: "b2e-capacity-gpu:w2",
            w: "analyst",
            ru: "аналитик",
            gloss: "a professional who examines data to draw conclusions",
            ipa: "/ˈæn.ə.lɪst/",
            pos: "noun",
            example: "The capacity analyst modelled three growth scenarios for the cluster.",
          },
        ],
      },
      {
        en: "Three procurement scenarios have been modelled. Scenario A — baseline: no additional on-demand GPU instances are reserved, but the spot-instance pool is expanded from 4 to 12 nodes. This should provide adequate buffer for median load but is unlikely to be sufficient during the expected July onboarding peak.",
        ru: "Смоделированы три сценария закупок. Сценарий A — базовый: дополнительные GPU-инстансы по требованию не резервируются, но пул spot-инстансов расширяется с 4 до 12 узлов. Это должно обеспечить достаточный буфер для медианной нагрузки, но вряд ли будет достаточным в период ожидаемого пика подключений в июле.",
      },
      {
        en: "Scenario B — recommended: four additional on-demand A100 instances are reserved for the quarter at a committed use discount, supplemented by the expanded spot pool. This is considered the most cost-effective option that also meets the 99.5% availability SLO for the AI search feature. The estimated incremental cost is $28,400 per month.",
        ru: "Сценарий B — рекомендуемый: четыре дополнительных on-demand инстанса A100 резервируются на квартал со скидкой за обязательное использование, дополненные расширенным пулом spot-инстансов. Это считается наиболее экономически эффективным вариантом, также отвечающим SLO доступности 99,5% для функции поиска на основе ИИ. Расчётные дополнительные затраты составляют $28 400 в месяц.",
      },
      {
        en: "Additionally, it is recommended that the inference request queue be configured with a maximum depth of 500 requests and a circuit-breaker threshold of 450. When queue depth exceeds 450, new requests should be rejected with a 429 Too Many Requests response rather than queued. This prevents the cascading latency increase that was observed during the May load test when the queue was allowed to grow unbounded.",
        ru: "Кроме того, рекомендуется настроить очередь запросов инференса с максимальной глубиной 500 запросов и порогом автоматического выключателя 450. Когда глубина очереди превысит 450, новые запросы следует отклонять ответом 429 Too Many Requests, а не ставить в очередь. Это предотвращает каскадное увеличение задержки, наблюдавшееся во время нагрузочного тестирования в мае, когда очереди давали неограниченно расти.",
      },
    ],
    phrases: [
      {
        id: "b2e-capacity-gpu:p1",
        en: "is projected to reach",
        ru: "прогнозируется достижение / ожидается, что достигнет",
        note: { en: "Passive future projection phrase for capacity estimates.", ru: "Пассивная фраза будущего прогноза для оценок ёмкости." },
      },
      {
        id: "b2e-capacity-gpu:p2",
        en: "committed use discount",
        ru: "скидка за обязательное использование",
        note: { en: "Cloud billing term for reserved-capacity pricing with lower rates.", ru: "Термин облачного биллинга для цен на зарезервированную ёмкость с более низкими тарифами." },
      },
      {
        id: "b2e-capacity-gpu:p3",
        en: "is unlikely to be sufficient",
        ru: "вряд ли будет достаточным",
        note: { en: "Hedged negative projection used in capacity and risk assessments.", ru: "Хеджированный отрицательный прогноз, используемый в оценках ёмкости и рисков." },
      },
    ],
    questions: [
      {
        id: "b2e-capacity-gpu:q1",
        q: { en: "What is the projected GPU utilisation by mid-August without additional capacity?", ru: "Каков прогнозируемый уровень утилизации GPU к середине августа без дополнительной ёмкости?" },
        options: [
          { en: "71%", ru: "71%" },
          { en: "85%", ru: "85%" },
          { en: "95%", ru: "95%" },
          { en: "100%", ru: "100%" },
        ],
        answer: 2,
        explain: {
          en: "The memo projects utilisation will reach 95% by mid-August if no additional capacity is acquired.",
          ru: "Записка прогнозирует, что утилизация достигнет 95% к середине августа при отсутствии дополнительной ёмкости.",
        },
      },
      {
        id: "b2e-capacity-gpu:q2",
        q: { en: "Why is Scenario A considered insufficient for the July onboarding period?", ru: "Почему Сценарий A считается недостаточным для периода подключений в июле?" },
        options: [
          { en: "It does not include any spot instances", ru: "Он не включает никаких spot-инстансов" },
          { en: "It is unlikely to handle the expected July onboarding peak", ru: "Он вряд ли справится с ожидаемым пиком подключений в июле" },
          { en: "It exceeds the quarterly budget by 30%", ru: "Он превышает квартальный бюджет на 30%" },
        ],
        answer: 1,
        explain: {
          en: "The memo states Scenario A should handle median load but is unlikely to be sufficient during the expected July onboarding peak.",
          ru: "Записка указывает, что Сценарий A должен справляться с медианной нагрузкой, но вряд ли будет достаточным в период ожидаемого пика подключений в июле.",
        },
      },
      {
        id: "b2e-capacity-gpu:q3",
        q: { en: "What problem does setting a circuit-breaker threshold of 450 requests solve?", ru: "Какую проблему решает установка порога автоматического выключателя в 450 запросов?" },
        options: [
          { en: "It prevents GPU memory from being exhausted by large models", ru: "Оно предотвращает исчерпание памяти GPU большими моделями" },
          { en: "It prevents cascading latency increases caused by an unbounded queue", ru: "Оно предотвращает каскадное увеличение задержки из-за неограниченной очереди" },
          { en: "It ensures fair scheduling between enterprise and free-tier users", ru: "Оно обеспечивает справедливое планирование между корпоративными пользователями и пользователями бесплатного уровня" },
        ],
        answer: 1,
        explain: {
          en: "The memo explains this prevents the cascading latency increase seen in the May load test when the queue was allowed to grow unbounded.",
          ru: "Записка объясняет, что это предотвращает каскадное увеличение задержки, наблюдавшееся в нагрузочном тестировании в мае, когда очередям давали неограниченно расти.",
        },
      },
    ],
    targetWords: ["ngsl:2088", "ngsl:2168", "ngsl:2169", "ngsl:2252", "ngsl:2277", "ngsl:2049", "ngsl:2372"],
  },

  // ── 10. Security advisory ──────────────────────────────────────────────────
  {
    id: "b2e-security-ssrf",
    level: "B2",
    stream: "engineering",
    title: {
      en: "Security Advisory: Server-Side Request Forgery (SSRF) in Webhook URL Validator — SA-2026-011",
      ru: "Рекомендация безопасности: Подделка запросов на стороне сервера (SSRF) в валидаторе URL вебхуков — SA-2026-011",
    },
    blurb: {
      en: "An internal security advisory describing an SSRF vulnerability discovered in the webhook registration endpoint, which allowed an authenticated user to probe internal network addresses, including the cloud metadata service.",
      ru: "Внутренняя рекомендация безопасности, описывающая уязвимость SSRF, обнаруженную в эндпоинте регистрации вебхуков, которая позволяла аутентифицированному пользователю зондировать адреса внутренней сети, включая облачный сервис метаданных.",
    },
    source: { en: "Security advisory", ru: "Рекомендация безопасности" },
    passages: [
      {
        en: "Severity: High (CVSS 3.1 score: 8.1). Affected component: Webhook registration endpoint POST /api/webhooks. Discovered: 2026-05-18 (internal security review). Fixed in: 2026-05-22 (hotfix release 2.30.4). A server-side request forgery (SSRF) vulnerability was identified in the webhook URL validation logic. An authenticated user was found to be able to register a webhook targeting an internal IP address or a DNS name that resolves to an internal address, causing the application server to issue outbound HTTP requests to arbitrary internal endpoints.",
        ru: "Серьёзность: Высокая (оценка CVSS 3.1: 8.1). Затронутый компонент: Эндпоинт регистрации вебхука POST /api/webhooks. Обнаружено: 18 мая 2026 года (внутренняя проверка безопасности). Исправлено в: 22 мая 2026 года (хотфикс-релиз 2.30.4). В логике валидации URL вебхука была выявлена уязвимость подделки запросов на стороне сервера (SSRF). Было установлено, что аутентифицированный пользователь мог регистрировать вебхук, нацеленный на внутренний IP-адрес или DNS-имя, разрешающееся во внутренний адрес, заставляя сервер приложения отправлять исходящие HTTP-запросы к произвольным внутренним эндпоинтам.",
        words: [
          {
            id: "b2e-security-ssrf:w1",
            w: "privilege",
            ru: "привилегия, право",
            gloss: "an elevated level of access or capability granted to a user or process",
            ipa: "/ˈprɪv.ɪ.lɪdʒ/",
            pos: "noun",
            example: "The SSRF was exploitable by any user with standard privileges.",
          },
        ],
      },
      {
        en: "Impact: It was determined that the vulnerability could be exploited to access the cloud provider instance metadata service at 169.254.169.254. Metadata endpoints at this address may expose the IAM role credentials associated with the application server. If these credentials were retrieved, an attacker could potentially assume the IAM role and gain access to all AWS resources the role is permitted to use.",
        ru: "Влияние: Было установлено, что уязвимость могла быть использована для доступа к облачному сервису метаданных инстанса по адресу 169.254.169.254. Эндпоинты метаданных по этому адресу могут раскрывать учётные данные IAM-роли, связанной с сервером приложения. Если бы эти учётные данные были получены, злоумышленник потенциально мог бы принять IAM-роль и получить доступ ко всем ресурсам AWS, к которым роль имеет разрешение.",
        words: [
          {
            id: "b2e-security-ssrf:w2",
            w: "isolate",
            ru: "изолировать",
            gloss: "to separate something from its surroundings to limit interaction",
            ipa: "/ˈaɪ.sə.leɪt/",
            pos: "verb",
            example: "The affected service was isolated from the metadata endpoint via egress rules.",
          },
        ],
      },
      {
        en: "Root cause: The original URL validator checked only that the scheme was https and that a Host header was present. It did not perform DNS resolution of the target hostname prior to issuing the test request, nor did it maintain a blocklist of reserved IP ranges (RFC 1918, 169.254.0.0/16). This gap was introduced in release 2.28.0 when the validation logic was refactored to accommodate international domain names.",
        ru: "Первопричина: Исходный валидатор URL проверял только то, что схема была https и присутствовал заголовок Host. Он не выполнял DNS-разрешение целевого имени хоста перед отправкой тестового запроса и не поддерживал список блокировки зарезервированных диапазонов IP (RFC 1918, 169.254.0.0/16). Этот пробел был введён в релизе 2.28.0, когда логика валидации была переработана для поддержки международных доменных имён.",
      },
      {
        en: "Fix applied: A pre-request DNS resolution step was added to the webhook validator. The resolved IP addresses are now checked against a blocklist that covers all RFC 1918 private ranges, the link-local block (169.254.0.0/16), and the loopback range (127.0.0.0/8). If any resolved address falls within a blocked range, the registration request is to be rejected with HTTP 422 and an explanatory error message.",
        ru: "Применённое исправление: В валидатор вебхука был добавлен шаг предварительного DNS-разрешения. Разрешённые IP-адреса теперь проверяются по списку блокировки, охватывающему все частные диапазоны RFC 1918, блок link-local (169.254.0.0/16) и диапазон loopback (127.0.0.0/8). Если какой-либо разрешённый адрес попадает в заблокированный диапазон, запрос регистрации должен быть отклонён с HTTP 422 и пояснительным сообщением об ошибке.",
        words: [
          {
            id: "b2e-security-ssrf:w3",
            w: "detect",
            ru: "обнаруживать",
            gloss: "to discover or identify something, especially a threat or anomaly",
            ipa: "/dɪˈtekt/",
            pos: "verb",
            example: "The WAF was configured to detect and block SSRF patterns in webhook URLs.",
          },
        ],
      },
      {
        en: "Recommended actions for affected deployments: Operators running versions 2.28.0 through 2.30.3 should upgrade to 2.30.4 immediately. As a temporary mitigation, egress network rules should be configured on the application nodes to block outbound requests to RFC 1918 and 169.254.0.0/16 ranges at the network layer. This network-level control should be considered defence-in-depth and does not replace the application-level fix.",
        ru: "Рекомендуемые действия для затронутых развёртываний: Операторам, использующим версии 2.28.0–2.30.3, следует немедленно обновиться до 2.30.4. В качестве временной меры на узлах приложения должны быть настроены правила исходящей сети для блокировки исходящих запросов к диапазонам RFC 1918 и 169.254.0.0/16 на сетевом уровне. Данный сетевой контроль следует рассматривать как многоуровневую защиту и он не заменяет исправление на уровне приложения.",
      },
    ],
    phrases: [
      {
        id: "b2e-security-ssrf:p1",
        en: "defence-in-depth",
        ru: "многоуровневая защита / глубокая оборона",
        note: { en: "Security principle of applying multiple independent layers of controls.", ru: "Принцип безопасности применения нескольких независимых уровней контроля." },
      },
      {
        id: "b2e-security-ssrf:p2",
        en: "was found to be able to",
        ru: "оказалось, что мог / было установлено, что может",
        note: { en: "Passive discovery phrasing for documenting a confirmed exploit path.", ru: "Пассивная формулировка обнаружения для документирования подтверждённого пути эксплойта." },
      },
      {
        id: "b2e-security-ssrf:p3",
        en: "does not replace",
        ru: "не заменяет",
        note: { en: "Clarifies that a mitigation is supplementary, not a full fix.", ru: "Уточняет, что мера по снижению риска является дополнительной, а не полным исправлением." },
      },
      {
        id: "b2e-security-ssrf:p4",
        en: "is to be rejected",
        ru: "должно быть отклонено",
        note: { en: "Formal passive obligation for describing validated system behaviour.", ru: "Формальная пассивная обязанность для описания подтверждённого поведения системы." },
      },
    ],
    questions: [
      {
        id: "b2e-security-ssrf:q1",
        q: { en: "What cloud service could be reached by exploiting this SSRF vulnerability?", ru: "К какому облачному сервису можно было получить доступ, используя эту уязвимость SSRF?" },
        options: [
          { en: "The internal Kubernetes API server", ru: "Внутренний API-сервер Kubernetes" },
          { en: "The cloud provider instance metadata service at 169.254.169.254", ru: "Облачный сервис метаданных инстанса по адресу 169.254.169.254" },
          { en: "The internal Redis cache cluster", ru: "Внутренний кластер кеша Redis" },
          { en: "The internal DNS resolver", ru: "Внутренний DNS-резолвер" },
        ],
        answer: 1,
        explain: {
          en: "The advisory specifically identifies the instance metadata service at 169.254.169.254 as the high-impact target reachable via the SSRF.",
          ru: "Рекомендация специально указывает сервис метаданных инстанса по адресу 169.254.169.254 как высокоуровневую цель, достижимую через SSRF.",
        },
      },
      {
        id: "b2e-security-ssrf:q2",
        q: { en: "What was missing from the original webhook URL validator that allowed SSRF?", ru: "Чего не хватало в исходном валидаторе URL вебхука, что позволило SSRF?" },
        options: [
          { en: "HTTPS scheme enforcement", ru: "Требование схемы HTTPS" },
          { en: "Pre-request DNS resolution and IP blocklist checking", ru: "Предварительное DNS-разрешение и проверка по списку блокировки IP" },
          { en: "Authentication checks on the webhook endpoint", ru: "Проверки аутентификации на эндпоинте вебхука" },
        ],
        answer: 1,
        explain: {
          en: "The original validator did not resolve the hostname to an IP before issuing the test request, and had no blocklist for private/reserved IP ranges.",
          ru: "Исходный валидатор не разрешал имя хоста в IP перед отправкой тестового запроса и не имел списка блокировки для частных/зарезервированных диапазонов IP.",
        },
      },
      {
        id: "b2e-security-ssrf:q3",
        q: { en: "What is the relationship between the network-layer egress rule and the application-level fix?", ru: "Каково соотношение между правилом исходящей сети на сетевом уровне и исправлением на уровне приложения?" },
        options: [
          { en: "The network rule is the permanent fix; the app-level fix is optional", ru: "Сетевое правило является постоянным исправлением; исправление на уровне приложения необязательно" },
          { en: "They are equivalent and either one alone is sufficient", ru: "Они эквивалентны и любого из них в отдельности достаточно" },
          { en: "The network rule is a defence-in-depth supplement; the app-level fix is required", ru: "Сетевое правило является дополнением к многоуровневой защите; исправление на уровне приложения обязательно" },
        ],
        answer: 2,
        explain: {
          en: "The advisory states the network control is defence-in-depth and does not replace the application-level fix.",
          ru: "Рекомендация указывает, что сетевой контроль является многоуровневой защитой и не заменяет исправление на уровне приложения.",
        },
      },
    ],
    targetWords: ["ngsl:2435", "ngsl:2412", "ngsl:2078", "ngsl:2343", "ngsl:2088", "ngsl:2044", "ngsl:2045"],
  },
];
