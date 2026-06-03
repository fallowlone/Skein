// Scaffold the System Design 2-track block: append units to units.json and
// emit stub topic lessons (EN+RU) for every content lesson + assessment block.
// Stubs are status:stub. Practice JSON is authored later (practice-count only
// checks ready lessons). Unit-nested lesson pages are NOT matched by the dist
// HTML path parser in lessons.ts, so the heavy topic-section lint does not run
// on them — stubs only need valid frontmatter + a rendering body.
//
// Run: node scripts/scaffold-system-design.mjs
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, "..");
const LESSONS = join(SITE, "src/content/lessons");
const UNITS_JSON = join(SITE, "src/content/units.json");
const PRIMER = "https://github.com/donnemartin/system-design-primer";

// ── Manifest ────────────────────────────────────────────────────────────────
// Each unit: { slug, order, title{en,ru}, crux{en,ru}, assessment, lessons:[{slug,en,ru}] }
const A = {
  track: "system-design",
  units: [
    { slug: "00-start-here", order: 0, assessment: false,
      title: { en: "Start here", ru: "Начни отсюда" },
      crux: { en: "What system design is, and the frame you carry into every design problem.", ru: "Что такое system design и рамка, с которой подходишь к любой задаче проектирования." },
      lessons: [
        { slug: "01-what-is-system-design", en: "What system design is", ru: "Что такое system design" },
        { slug: "02-the-interview-frame", en: "The design frame", ru: "Рамка проектирования" },
      ] },
    { slug: "01-scalability", order: 1, assessment: true,
      title: { en: "Scalability & performance", ru: "Масштабируемость и производительность" },
      crux: { en: "Latency, throughput, and the back-of-envelope numbers that govern every scaling decision.", ru: "Задержка, пропускная способность и оценки на салфетке, что управляют любым решением о масштабировании." },
      lessons: [
        { slug: "01-latency-vs-throughput", en: "Latency vs throughput", ru: "Задержка против пропускной способности" },
        { slug: "02-vertical-vs-horizontal", en: "Vertical vs horizontal scaling", ru: "Вертикальное против горизонтального масштабирования" },
        { slug: "03-back-of-envelope", en: "Back-of-the-envelope estimation", ru: "Оценка на салфетке" },
        { slug: "04-numbers-to-know", en: "Numbers every engineer should know", ru: "Числа, которые должен знать каждый инженер" },
      ] },
    { slug: "02-availability", order: 2, assessment: true,
      title: { en: "Availability & reliability", ru: "Доступность и надёжность" },
      crux: { en: "Redundancy, failover, and the SLO math that decides how many nines you can promise.", ru: "Резервирование, failover и математика SLO, решающая сколько девяток можно обещать." },
      lessons: [
        { slug: "01-sla-slo-sli", en: "SLA, SLO, SLI", ru: "SLA, SLO, SLI" },
        { slug: "02-redundancy-and-spof", en: "Redundancy & single points of failure", ru: "Резервирование и единые точки отказа" },
        { slug: "03-failover-and-fault-tolerance", en: "Failover & fault tolerance", ru: "Failover и отказоустойчивость" },
      ] },
    { slug: "03-traffic", order: 3, assessment: true,
      title: { en: "Traffic & edge", ru: "Трафик и периметр" },
      crux: { en: "How requests are spread across servers and served close to users: load balancers, proxies, gateways, CDNs.", ru: "Как запросы распределяются по серверам и отдаются ближе к пользователю: балансировщики, прокси, шлюзы, CDN." },
      lessons: [
        { slug: "01-load-balancing", en: "Load balancing", ru: "Балансировка нагрузки" },
        { slug: "02-reverse-proxy-and-gateway", en: "Reverse proxy & API gateway", ru: "Обратный прокси и API-шлюз" },
        { slug: "03-cdn", en: "Content delivery networks", ru: "Сети доставки контента (CDN)" },
      ] },
    { slug: "04-data-distribution", order: 4, assessment: true,
      title: { en: "Data distribution", ru: "Распределение данных" },
      crux: { en: "Replication, sharding, consistent hashing, and the CAP/PACELC tradeoffs that follow from splitting data.", ru: "Репликация, шардинг, consistent hashing и трейдоффы CAP/PACELC, вытекающие из дробления данных." },
      lessons: [
        { slug: "01-replication", en: "Replication", ru: "Репликация" },
        { slug: "02-sharding-and-partitioning", en: "Sharding & partitioning", ru: "Шардинг и партиционирование" },
        { slug: "03-consistent-hashing", en: "Consistent hashing", ru: "Consistent hashing" },
        { slug: "04-cap-and-pacelc", en: "CAP & PACELC", ru: "CAP и PACELC" },
      ] },
    { slug: "05-caching-at-scale", order: 5, assessment: true,
      title: { en: "Caching at scale", ru: "Кэширование при масштабе" },
      crux: { en: "Where to cache, what to evict, and why invalidation is the hard part.", ru: "Где кэшировать, что вытеснять и почему инвалидация — самая трудная часть." },
      lessons: [
        { slug: "01-caching-strategies", en: "Caching strategies", ru: "Стратегии кэширования" },
        { slug: "02-eviction-and-ttl", en: "Eviction & TTL", ru: "Вытеснение и TTL" },
        { slug: "03-distributed-cache", en: "Distributed caches", ru: "Распределённые кэши" },
        { slug: "04-cache-invalidation", en: "Cache invalidation", ru: "Инвалидация кэша" },
      ] },
    { slug: "06-async-messaging", order: 6, assessment: true,
      title: { en: "Async & messaging", ru: "Асинхронность и сообщения" },
      crux: { en: "Decoupling with queues and pub/sub, event-driven flow, and surviving backpressure.", ru: "Развязка через очереди и pub/sub, событийный поток и выживание под backpressure." },
      lessons: [
        { slug: "01-message-queues", en: "Message queues", ru: "Очереди сообщений" },
        { slug: "02-pub-sub", en: "Publish/subscribe", ru: "Publish/subscribe" },
        { slug: "03-event-driven", en: "Event-driven architecture", ru: "Событийная архитектура" },
        { slug: "04-backpressure", en: "Backpressure", ru: "Backpressure" },
      ] },
    { slug: "07-storage-choices", order: 7, assessment: true,
      title: { en: "Storage choices", ru: "Выбор хранилища" },
      crux: { en: "Picking the right store: relational, NoSQL, blob/object, time-series, search.", ru: "Выбор правильного хранилища: реляционное, NoSQL, blob/object, time-series, поиск." },
      lessons: [
        { slug: "01-sql-vs-nosql", en: "SQL vs NoSQL", ru: "SQL против NoSQL" },
        { slug: "02-blob-and-object", en: "Blob & object storage", ru: "Blob и объектное хранилище" },
        { slug: "03-time-series-and-search", en: "Time-series & search stores", ru: "Time-series и поисковые хранилища" },
      ] },
    { slug: "08-building-blocks", order: 8, assessment: true,
      title: { en: "Building blocks", ru: "Строительные блоки" },
      crux: { en: "Reusable mechanisms that show up in every design: rate limiter, unique IDs, bloom filters, geohashing, leader election.", ru: "Переиспользуемые механизмы из каждого дизайна: rate limiter, уникальные ID, фильтры Блума, geohashing, выбор лидера." },
      lessons: [
        { slug: "01-rate-limiter", en: "Rate limiter", ru: "Rate limiter" },
        { slug: "02-unique-id-generation", en: "Unique ID generation", ru: "Генерация уникальных ID" },
        { slug: "03-bloom-filters", en: "Bloom filters", ru: "Фильтры Блума" },
        { slug: "04-geohashing", en: "Geohashing", ru: "Geohashing" },
        { slug: "05-leader-election", en: "Leader election", ru: "Выбор лидера" },
      ] },
    { slug: "09-interview-framework", order: 9, assessment: true,
      title: { en: "The interview framework", ru: "Фреймворк интервью" },
      crux: { en: "A repeatable procedure: requirements, estimation, high-level design, deep-dive, bottlenecks, tradeoffs.", ru: "Повторяемая процедура: требования, оценки, высокоуровневый дизайн, deep-dive, узкие места, трейдоффы." },
      lessons: [
        { slug: "01-requirements", en: "Clarifying requirements", ru: "Прояснение требований" },
        { slug: "02-estimation", en: "Estimation", ru: "Оценки" },
        { slug: "03-hld-and-deep-dive", en: "High-level design & deep-dive", ru: "Высокоуровневый дизайн и deep-dive" },
        { slug: "04-bottlenecks-and-tradeoffs", en: "Bottlenecks & tradeoffs", ru: "Узкие места и трейдоффы" },
      ] },
  ],
};

const B = {
  track: "system-design-cases",
  units: [
    { slug: "01-foundational", order: 1, assessment: true,
      title: { en: "Foundational designs", ru: "Базовые разборы" },
      crux: { en: "The canonical first designs: a key-value store, a URL shortener, a web crawler, a distributed queue.", ru: "Канонические первые разборы: key-value хранилище, сокращатель ссылок, веб-краулер, распределённая очередь." },
      lessons: [
        { slug: "01-key-value-store", en: "Design a key-value store", ru: "Спроектируй key-value хранилище" },
        { slug: "02-url-shortener", en: "Design a URL shortener", ru: "Спроектируй сокращатель ссылок" },
        { slug: "03-web-crawler", en: "Design a web crawler", ru: "Спроектируй веб-краулер" },
        { slug: "04-distributed-message-queue", en: "Design a distributed message queue", ru: "Спроектируй распределённую очередь сообщений" },
      ] },
    { slug: "02-social-feed", order: 2, assessment: true,
      title: { en: "Social & feed", ru: "Соцсеть и лента" },
      crux: { en: "Fan-out, ranking, real-time delivery: notifications, news feed, chat, autocomplete.", ru: "Fan-out, ранжирование, доставка в реальном времени: уведомления, лента, чат, автодополнение." },
      lessons: [
        { slug: "01-notification-system", en: "Design a notification system", ru: "Спроектируй систему уведомлений" },
        { slug: "02-news-feed", en: "Design a news feed", ru: "Спроектируй ленту новостей" },
        { slug: "03-chat-system", en: "Design a chat system", ru: "Спроектируй чат" },
        { slug: "04-search-autocomplete", en: "Design search autocomplete", ru: "Спроектируй автодополнение поиска" },
      ] },
    { slug: "03-media-storage", order: 3, assessment: true,
      title: { en: "Media & storage", ru: "Медиа и хранилище" },
      crux: { en: "Huge files, huge fan-out reads: video, file sync, object storage, email at scale.", ru: "Огромные файлы, огромный fan-out на чтение: видео, синхронизация файлов, объектное хранилище, почта при масштабе." },
      lessons: [
        { slug: "01-youtube", en: "Design YouTube", ru: "Спроектируй YouTube" },
        { slug: "02-google-drive", en: "Design Google Drive", ru: "Спроектируй Google Drive" },
        { slug: "03-object-storage", en: "Design an S3-like object store", ru: "Спроектируй объектное хранилище в духе S3" },
        { slug: "04-distributed-email", en: "Design a distributed email service", ru: "Спроектируй распределённую почту" },
      ] },
    { slug: "04-location-realtime", order: 4, assessment: true,
      title: { en: "Location & realtime", ru: "Геолокация и реальное время" },
      crux: { en: "Spatial indexing and low-latency updates: proximity, nearby friends, maps, leaderboards.", ru: "Пространственное индексирование и обновления с низкой задержкой: близость, друзья рядом, карты, лидерборды." },
      lessons: [
        { slug: "01-proximity-service", en: "Design a proximity service", ru: "Спроектируй сервис близости" },
        { slug: "02-nearby-friends", en: "Design nearby friends", ru: "Спроектируй «друзья рядом»" },
        { slug: "03-google-maps", en: "Design Google Maps", ru: "Спроектируй Google Maps" },
        { slug: "04-gaming-leaderboard", en: "Design a realtime leaderboard", ru: "Спроектируй лидерборд в реальном времени" },
      ] },
    { slug: "05-data-money", order: 5, assessment: true,
      title: { en: "Data & money", ru: "Данные и деньги" },
      crux: { en: "Correctness under load and money on the line: metrics, ad aggregation, payments, wallets, exchanges, reservations.", ru: "Корректность под нагрузкой и деньги на кону: метрики, агрегация рекламы, платежи, кошельки, биржи, бронирование." },
      lessons: [
        { slug: "01-metrics-monitoring", en: "Design a metrics & alerting system", ru: "Спроектируй систему метрик и алертов" },
        { slug: "02-ad-click-aggregation", en: "Design ad-click aggregation", ru: "Спроектируй агрегацию кликов по рекламе" },
        { slug: "03-payment-system", en: "Design a payment system", ru: "Спроектируй платёжную систему" },
        { slug: "04-digital-wallet", en: "Design a digital wallet", ru: "Спроектируй цифровой кошелёк" },
        { slug: "05-stock-exchange", en: "Design a stock exchange", ru: "Спроектируй биржу" },
        { slug: "06-hotel-reservation", en: "Design a hotel reservation system", ru: "Спроектируй систему бронирования отелей" },
      ] },
  ],
};

const ASSESSMENT = [
  { slug: "quiz-choice", en: "multiple-choice review", ru: "обзор с выбором ответа", est: 12 },
  { slug: "quiz-short", en: "short-answer review", ru: "обзор с коротким ответом", est: 12 },
  { slug: "quiz-code", en: "applied review", ru: "прикладной обзор", est: 14 },
  { slug: "project", en: "hands-on project", ru: "практический проект", est: 200 },
];

// ── Stub emitters ─────────────────────────────────────────────────────────────
function lessonStub({ track, unit, slug, order, title, summary, lang }) {
  const recapLang = lang;
  return `---
slug: "${slug}"
lang: ${lang}
track: "${track}"
unit: "${unit}"
order: ${order}
title: ${JSON.stringify(title)}
summary: ${JSON.stringify(summary)}
estMin: 16
status: stub
lessonType: topic
level: middle
concepts: []
prereqs: []
sources:
  - ${PRIMER}
---
import Hook from "~/components/lesson/Hook.astro";
import Crux from "~/components/prose/Crux.astro";
import Explanation from "~/components/lesson/Explanation.astro";
import KeyTakeaway from "~/components/prose/KeyTakeaway.astro";
import Recap from "~/components/lesson/Recap.astro";

<Hook>${lang === "ru" ? "ЗАГЛУШКА — урок будет написан." : "STUB — lesson to be authored."}</Hook>

<Crux>${lang === "ru" ? "ЗАГЛУШКА." : "STUB."}</Crux>

<Explanation>

## ${title}

${lang === "ru" ? "Содержимое будет написано при авторинге." : "Body to be authored."}

</Explanation>

<KeyTakeaway>${lang === "ru" ? "ЗАГЛУШКА." : "STUB."}</KeyTakeaway>

<Recap lang="${recapLang}">${lang === "ru" ? "ЗАГЛУШКА." : "STUB."}</Recap>
`;
}

function assessmentStub({ track, unit, slug, order, kind, lang }) {
  // block-stubs lint allows status:stub blocks to contain the boilerplate phrase.
  const boiler = lang === "ru"
    ? `Это ${slug} для юнита ${unit}. ЗАГЛУШКА.`
    : `This is a ${slug} for the ${unit} unit. STUB.`;
  const title = lang === "ru" ? `${unit}: ${kind.ru}` : `${unit}: ${kind.en}`;
  const summary = lang === "ru" ? `Заглушка блока оценивания (${kind.ru}).` : `Assessment block stub (${kind.en}).`;
  return `---
slug: "${slug}"
lang: ${lang}
track: "${track}"
unit: "${unit}"
order: ${order}
title: ${JSON.stringify(title)}
summary: ${JSON.stringify(summary)}
estMin: ${kind.est}
status: stub
level: senior
concepts: []
prereqs: []
sources:
  - ${PRIMER}
---
import Hook from "~/components/lesson/Hook.astro";
import Recap from "~/components/lesson/Recap.astro";

<Hook>${boiler}</Hook>

<Recap lang="${lang}">${lang === "ru" ? "ЗАГЛУШКА." : "STUB."}</Recap>
`;
}

async function emit(track, units) {
  const unitEntries = [];
  let lessonFiles = 0, blockFiles = 0;
  for (const u of units) {
    const lessonSlugs = [];
    let order = 0;
    for (const les of u.lessons) {
      order += 1;
      lessonSlugs.push(les.slug);
      const summaryEn = `${les.en} — to be authored.`;
      const summaryRu = `${les.ru} — будет написано.`;
      for (const [lang, title, summary] of [["en", les.en, summaryEn], ["ru", les.ru, summaryRu]]) {
        const dir = join(LESSONS, lang, track, u.slug, les.slug);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, "index.mdx"),
          lessonStub({ track, unit: u.slug, slug: les.slug, order, title, summary, lang }));
        lessonFiles += 1;
      }
    }
    if (u.assessment) {
      for (const a of ASSESSMENT) {
        order += 1;
        lessonSlugs.push(a.slug);
        for (const lang of ["en", "ru"]) {
          const dir = join(LESSONS, lang, track, u.slug, a.slug);
          await mkdir(dir, { recursive: true });
          await writeFile(join(dir, "index.mdx"),
            assessmentStub({ track, unit: u.slug, slug: a.slug, order, kind: a, lang }));
          blockFiles += 1;
        }
      }
    }
    unitEntries.push({
      id: `${track}/${u.slug}`,
      slug: u.slug,
      track,
      order: u.order,
      title: u.title,
      crux: u.crux,
      lessons: lessonSlugs,
      status: "stub",
    });
  }
  return { unitEntries, lessonFiles, blockFiles };
}

// ── Run ───────────────────────────────────────────────────────────────────────
const units = JSON.parse(await readFile(UNITS_JSON, "utf8"));
const existing = new Set(units.map((u) => u.id));

const ra = await emit(A.track, A.units);
const rb = await emit(B.track, B.units);
const newUnits = [...ra.unitEntries, ...rb.unitEntries].filter((u) => !existing.has(u.id));

units.push(...newUnits);
await writeFile(UNITS_JSON, JSON.stringify(units, null, 2) + "\n");

console.log(`units added: ${newUnits.length}`);
console.log(`content lesson files (en+ru): ${ra.lessonFiles + rb.lessonFiles}`);
console.log(`assessment block files (en+ru): ${ra.blockFiles + rb.blockFiles}`);
