import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../src/content/lessons", import.meta.url).pathname;

// unit, slug, order, en title, ru title, source url
const LESSONS = [
  ["03-errors-and-diagnostics", "01-error-handling", 1,
    "Error handling: throw, reject, and never swallow",
    "Обработка ошибок: throw, reject и не глотать",
    "https://nodejs.org/api/errors.html"],
  ["03-errors-and-diagnostics", "02-debugging-and-inspect", 2,
    "Debugging with --inspect and DevTools",
    "Отладка через --inspect и DevTools",
    "https://nodejs.org/en/learn/getting-started/debugging"],
  ["03-errors-and-diagnostics", "03-diagnostics", 3,
    "Diagnostics: channels, async context, and profiles",
    "Диагностика: каналы, async-контекст и профили",
    "https://nodejs.org/api/diagnostics_channel.html"],

  ["04-performance", "01-event-loop-monitoring", 1,
    "Monitoring event-loop lag",
    "Мониторинг задержки event loop",
    "https://nodejs.org/api/perf_hooks.html"],
  ["04-performance", "02-cpu-and-memory-profiling", 2,
    "CPU and memory profiling",
    "Профилирование CPU и памяти",
    "https://nodejs.org/en/learn/diagnostics/memory/using-heap-snapshot"],
  ["04-performance", "03-worker-threads-and-clustering", 3,
    "Worker threads and clustering",
    "Worker threads и кластеризация",
    "https://nodejs.org/api/worker_threads.html"],

  ["05-http-and-frameworks", "01-http-module", 1,
    "The http module: servers, clients, streaming",
    "Модуль http: серверы, клиенты, стриминг",
    "https://nodejs.org/api/http.html"],
  ["05-http-and-frameworks", "02-express-vs-fastify", 2,
    "Express vs Fastify",
    "Express против Fastify",
    "https://fastify.dev/docs/latest/Reference/"],
  ["05-http-and-frameworks", "03-middleware-and-errors", 3,
    "Middleware, error handling, graceful shutdown",
    "Middleware, обработка ошибок, graceful shutdown",
    "https://expressjs.com/en/guide/error-handling.html"],

  ["06-testing", "01-unit-testing", 1,
    "Unit testing with node:test and Vitest",
    "Юнит-тесты с node:test и Vitest",
    "https://nodejs.org/api/test.html"],
  ["06-testing", "02-integration-and-supertest", 2,
    "Integration testing an HTTP API",
    "Интеграционное тестирование HTTP API",
    "https://github.com/ladjs/supertest"],

  ["07-security", "01-input-and-secrets", 1,
    "Input validation and secrets",
    "Валидация ввода и секреты",
    "https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html"],
  ["07-security", "02-dependencies-and-supply-chain", 2,
    "Dependencies and supply-chain risk",
    "Зависимости и риск supply-chain",
    "https://docs.npmjs.com/cli/v10/commands/npm-audit"],

  ["08-packaging-and-deploy", "01-bundling-and-publishing", 1,
    "Bundling and publishing packages",
    "Бандлинг и публикация пакетов",
    "https://nodejs.org/api/packages.html"],
  ["08-packaging-and-deploy", "02-containerizing-node", 2,
    "Containerizing Node",
    "Контейнеризация Node",
    "https://docs.docker.com/guides/nodejs/containerize/"],

  ["09-putting-it-together", "01-capstone-production-service", 1,
    "Capstone: a production Node service",
    "Капстоун: production Node-сервис",
    "https://nodejs.org/en/learn/getting-started/nodejs-the-difference-between-development-and-production"],
];

function stub(lang, unit, slug, order, title, src) {
  return `---
slug: "${slug}"
lang: ${lang}
track: "node"
unit: "${unit}"
order: ${order}
title: "${title}"
summary: "${title} — stub; author to ready."
estMin: 12
status: stub
sources:
  - ${src}
---
`;
}

let n = 0;
for (const [unit, slug, order, en, ru, src] of LESSONS) {
  for (const [lang, title] of [["en", en], ["ru", ru]]) {
    const dir = join(ROOT, lang, "node", unit, slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.mdx"), stub(lang, unit, slug, order, title, src));
    n++;
  }
}
console.log(`wrote ${n} stub files`);
