import type { Bilingual } from "../types";

export type PretestChoice = { label: Bilingual; weight: 0 | 1 | 2 | 3 };
export type PretestQuestion = {
  id: string;
  prompt: Bilingual;
  choices: PretestChoice[];
};

export const pretestQuestions: PretestQuestion[] = [
  {
    id: "tcp",
    prompt: {
      en: "Why does TCP use a three-way handshake (SYN, SYN-ACK, ACK) instead of two messages?",
      ru: "Зачем TCP использует трёхэтапное рукопожатие (SYN, SYN-ACK, ACK), а не два сообщения?",
    },
    choices: [
      { label: { en: "I don't know what TCP is", ru: "Не знаю, что такое TCP" }, weight: 0 },
      { label: { en: "To make sure the message arrived", ru: "Чтобы убедиться, что сообщение дошло" }, weight: 1 },
      { label: { en: "Both sides must confirm initial sequence numbers and round-trip the offer", ru: "Обе стороны должны подтвердить начальные sequence numbers и пройти RTT" }, weight: 2 },
      { label: { en: "Three-way avoids half-open connections and lets each side advertise window + options atomically", ru: "Три этапа исключают half-open и позволяют обеим сторонам атомарно объявить окно и опции" }, weight: 3 },
    ],
  },
  {
    id: "db-index",
    prompt: {
      en: "When is a Postgres BRIN index a better fit than B-tree?",
      ru: "Когда BRIN-индекс в Postgres лучше, чем B-tree?",
    },
    choices: [
      { label: { en: "Never — B-tree is always best", ru: "Никогда — B-tree всегда лучше" }, weight: 0 },
      { label: { en: "For small tables", ru: "Для маленьких таблиц" }, weight: 1 },
      { label: { en: "When the column is correlated with physical row order (e.g. append-only timestamp)", ru: "Когда колонка коррелирует с физическим порядком строк (например, append-only timestamp)" }, weight: 2 },
      { label: { en: "On very large append-only tables where index size and write amplification dominate; BRIN trades selectivity for tiny on-disk footprint via per-range min/max summaries", ru: "На очень больших append-only таблицах, где размер индекса и write amplification критичны; BRIN жертвует селективностью ради крошечного размера через min/max по диапазонам" }, weight: 3 },
    ],
  },
  {
    id: "react",
    prompt: {
      en: "Why might passing an inline object to a memoized child cause re-renders even with React.memo?",
      ru: "Почему передача inline-объекта в memoized-ребёнка вызывает re-render даже с React.memo?",
    },
    choices: [
      { label: { en: "I haven't used React much", ru: "Мало работал с React" }, weight: 0 },
      { label: { en: "React.memo doesn't work on objects", ru: "React.memo не работает с объектами" }, weight: 1 },
      { label: { en: "The object identity changes every render", ru: "Identity объекта меняется на каждый render" }, weight: 2 },
      { label: { en: "Default React.memo uses Object.is for shallow prop comparison; an inline literal allocates a fresh reference per render, defeating memo unless you stabilize via useMemo or move the object out of render", ru: "React.memo по умолчанию использует Object.is для shallow-сравнения props; inline-литерал создаёт новую ссылку при каждом render, ломая memo, если не стабилизировать через useMemo или вынести объект из render" }, weight: 3 },
    ],
  },
  {
    id: "http",
    prompt: {
      en: "What does an HTTP 503 with a Retry-After header tell a well-behaved client?",
      ru: "Что HTTP 503 с заголовком Retry-After сообщает корректному клиенту?",
    },
    choices: [
      { label: { en: "I'm not sure what 503 means", ru: "Не уверен, что значит 503" }, weight: 0 },
      { label: { en: "The page is broken and won't come back", ru: "Страница сломана и не вернётся" }, weight: 1 },
      { label: { en: "The server is temporarily unavailable; wait the given time before retrying", ru: "Сервер временно недоступен; подождать указанное время перед повтором" }, weight: 2 },
      { label: { en: "It's a transient, retryable condition (overload/maintenance); the client should back off for Retry-After, ideally with jitter, instead of hammering the server and worsening the overload", ru: "Это временное, повторяемое состояние (перегрузка/обслуживание); клиент должен сделать back-off на Retry-After, желательно с jitter, а не долбить сервер, усугубляя перегрузку" }, weight: 3 },
    ],
  },
];

export const advancedQuestions: PretestQuestion[] = [
  {
    id: "adv-mvcc",
    prompt: {
      en: "An append-heavy Postgres table's reads slow down over weeks despite an index. autovacuum is on. Most likely?",
      ru: "Чтения из append-heavy таблицы Postgres деградируют неделями, несмотря на индекс. autovacuum включён. Вероятная причина?",
    },
    choices: [
      { label: { en: "The index is corrupt", ru: "Индекс повреждён" }, weight: 0 },
      { label: { en: "The table needs more RAM", ru: "Таблице нужно больше RAM" }, weight: 1 },
      { label: { en: "Dead tuples accumulate faster than autovacuum reclaims them, bloating heap and index", ru: "Мёртвые кортежи копятся быстрее, чем их собирает autovacuum — раздувание heap и индекса" }, weight: 2 },
      { label: { en: "Long-running transactions hold the xmin horizon back, so autovacuum can't remove dead tuples — bloat and index-only-scan degradation until the snapshot is released", ru: "Долгие транзакции удерживают xmin horizon, autovacuum не может удалить мёртвые кортежи — bloat и деградация index-only scan, пока снапшот не освобождён" }, weight: 3 },
    ],
  },
  {
    id: "adv-consensus",
    prompt: {
      en: "In Raft/Paxos, why must a commit be acknowledged by a majority quorum rather than any fixed set of nodes?",
      ru: "Почему в Raft/Paxos коммит должен подтверждаться majority quorum, а не любым фиксированным набором узлов?",
    },
    choices: [
      { label: { en: "Majority is just faster than waiting for everyone", ru: "Большинство просто быстрее, чем ждать всех" }, weight: 0 },
      { label: { en: "It tolerates more node failures than waiting for all replicas", ru: "Это переживает больше отказов узлов, чем ожидание всех реплик" }, weight: 1 },
      { label: { en: "A majority ensures more than half the cluster has the data, so it survives a minority crash", ru: "Большинство гарантирует, что данные есть у более чем половины кластера, переживая отказ меньшинства" }, weight: 2 },
      { label: { en: "Any two majority quorums must intersect in at least one node, so the next leader's election quorum is guaranteed to see every committed entry — preventing split-brain and lost commits", ru: "Любые два majority quorum пересекаются минимум в одном узле, поэтому quorum выборов следующего лидера гарантированно видит каждый закоммиченный entry — это исключает split-brain и потерю коммитов" }, weight: 3 },
    ],
  },
  {
    id: "adv-http-cache",
    prompt: {
      en: "What do `Cache-Control: stale-while-revalidate` and `Vary` together guarantee on a shared CDN cache?",
      ru: "Что вместе гарантируют `Cache-Control: stale-while-revalidate` и `Vary` на общем CDN-кэше?",
    },
    choices: [
      { label: { en: "They force the client to always fetch a fresh copy", ru: "Они заставляют клиента всегда тянуть свежую копию" }, weight: 0 },
      { label: { en: "stale-while-revalidate disables caching once the response is stale", ru: "stale-while-revalidate отключает кэширование, как только ответ устарел" }, weight: 1 },
      { label: { en: "stale-while-revalidate lets the cache serve a stale response while it refreshes in the background", ru: "stale-while-revalidate позволяет кэшу отдать устаревший ответ, пока он обновляется в фоне" }, weight: 2 },
      { label: { en: "Within the SWR window the cache serves stale instantly and revalidates in the background (no latency spike), while Vary keys the entry on the listed request headers so a shared cache never returns the wrong representation to a different client", ru: "В пределах окна SWR кэш мгновенно отдаёт stale и ревалидирует в фоне (без скачка latency), а Vary привязывает запись к перечисленным request-заголовкам, чтобы общий кэш не вернул чужому клиенту неверное представление" }, weight: 3 },
    ],
  },
  {
    id: "adv-event-loop",
    prompt: {
      en: "A Node/browser tab freezes — timers and rendering never run, yet CPU is busy. The code recursively chains resolved Promises. Why?",
      ru: "Node/вкладка браузера зависает — таймеры и рендеринг не выполняются, но CPU занят. Код рекурсивно цепляет разрешённые Promise. Почему?",
    },
    choices: [
      { label: { en: "Promises are slower than callbacks", ru: "Promise медленнее, чем коллбэки" }, weight: 0 },
      { label: { en: "The garbage collector can't keep up with the allocations", ru: "Сборщик мусора не успевает за аллокациями" }, weight: 1 },
      { label: { en: "The event loop is single-threaded, so heavy work blocks everything else", ru: "Event loop однопоточный, поэтому тяжёлая работа блокирует всё остальное" }, weight: 2 },
      { label: { en: "The microtask queue is fully drained before each macrotask; an unbounded promise chain keeps enqueuing microtasks, so the loop never reaches the macrotask queue — timers, I/O callbacks, and the render step are starved indefinitely", ru: "Очередь microtask полностью опустошается перед каждым macrotask; неограниченная цепочка Promise всё время добавляет microtask, поэтому цикл никогда не доходит до очереди macrotask — таймеры, I/O-коллбэки и шаг рендеринга голодают бесконечно" }, weight: 3 },
    ],
  },
  {
    id: "adv-tls-0rtt",
    prompt: {
      en: "Why is TLS 1.3 0-RTT early data considered unsafe for non-idempotent requests?",
      ru: "Почему early data в режиме 0-RTT TLS 1.3 считается небезопасным для неидемпотентных запросов?",
    },
    choices: [
      { label: { en: "0-RTT data is sent unencrypted", ru: "Данные 0-RTT отправляются в открытом виде" }, weight: 0 },
      { label: { en: "0-RTT uses weaker ciphers than the full handshake", ru: "0-RTT использует более слабые шифры, чем полное рукопожатие" }, weight: 1 },
      { label: { en: "An attacker who captured the early data could resend it to the server", ru: "Атакующий, перехвативший early data, может переслать её серверу" }, weight: 2 },
      { label: { en: "0-RTT early data is encrypted but not bound to the handshake's fresh exchange, so it carries no anti-replay guarantee — a captured flight can be replayed; only idempotent requests are safe unless the server enforces an anti-replay window (single-use tickets / freshness check)", ru: "Early data 0-RTT зашифрована, но не привязана к свежему обмену рукопожатия, поэтому не имеет защиты от повтора — перехваченный пакет можно воспроизвести; безопасны только идемпотентные запросы, если сервер не применяет anti-replay окно (одноразовые тикеты / проверка свежести)" }, weight: 3 },
    ],
  },
  {
    id: "adv-cap",
    prompt: {
      en: "Beyond CAP, what does PACELC add when describing a distributed datastore's tradeoffs?",
      ru: "Что PACELC добавляет к CAP при описании компромиссов распределённого хранилища?",
    },
    choices: [
      { label: { en: "PACELC proves you can have all three of C, A, and P at once", ru: "PACELC доказывает, что можно иметь все три — C, A и P — одновременно" }, weight: 0 },
      { label: { en: "PACELC is just a renaming of CAP with the same meaning", ru: "PACELC — это просто переименование CAP с тем же смыслом" }, weight: 1 },
      { label: { en: "Under a partition (P) you must choose availability (A) or consistency (C)", ru: "При partition (P) приходится выбирать между availability (A) и consistency (C)" }, weight: 2 },
      { label: { en: "It keeps CAP's partition branch (P → A vs C) but adds the else case: even with no partition (E), a replicated store still trades latency (L) against consistency (C) — naming the always-present cost that CAP omits", ru: "Оно сохраняет partition-ветку CAP (P → A или C), но добавляет else-случай: даже без partition (E) реплицированное хранилище всё равно балансирует latency (L) против consistency (C) — называя постоянную цену, которую CAP опускает" }, weight: 3 },
    ],
  },
];
