import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const FULLSTACK = [
  "ai-llm", "apis", "backend", "browser", "caching", "data-engineering",
  "databases", "deployment", "distributed", "engineering-practice", "frontend",
  "networking", "observability", "performance", "queues", "security",
];

// Per-pillar orientation unit metadata. Unit title is uniform; crux is the
// beginner-facing one-line "what this pillar is about". All < 140 chars.
export const ORIENTATION = {
  "ai-llm":               { title: { en: "Orientation", ru: "Введение" }, crux: { en: "What it means to build software on top of a large language model.", ru: "Что значит строить софт поверх большой языковой модели." } },
  "apis":                 { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How programs talk to each other over the web — the contract behind every app.", ru: "Как программы общаются по сети — контракт за каждым приложением." } },
  "backend":              { title: { en: "Orientation", ru: "Введение" }, crux: { en: "What the server does after a request arrives and before a response leaves.", ru: "Что сервер делает после прихода запроса и до отправки ответа." } },
  "browser":              { title: { en: "Orientation", ru: "Введение" }, crux: { en: "What happens inside the tab between a URL and pixels on screen.", ru: "Что происходит во вкладке между URL и пикселями на экране." } },
  "caching":              { title: { en: "Orientation", ru: "Введение" }, crux: { en: "Why keeping a copy of an answer is the cheapest way to go faster.", ru: "Почему хранение копии ответа — самый дешёвый способ ускориться." } },
  "data-engineering":     { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How raw events become tables you can ask questions of.", ru: "Как сырые события превращаются в таблицы, к которым задают вопросы." } },
  "databases":            { title: { en: "Orientation", ru: "Введение" }, crux: { en: "Why we store data in tables and trust them not to lose it.", ru: "Почему мы храним данные в таблицах и доверяем им их не терять." } },
  "deployment":           { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How code on your laptop becomes a service running for real users.", ru: "Как код на ноутбуке становится сервисом для реальных пользователей." } },
  "distributed":          { title: { en: "Orientation", ru: "Введение" }, crux: { en: "What changes once one machine becomes many that must agree.", ru: "Что меняется, когда одна машина становится многими, что должны согласовываться." } },
  "engineering-practice": { title: { en: "Orientation", ru: "Введение" }, crux: { en: "The habits that keep a growing codebase from collapsing under its weight.", ru: "Привычки, которые не дают растущему коду рухнуть под своим весом." } },
  "frontend":             { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How a user interface stays in sync with changing data.", ru: "Как интерфейс остаётся синхронным с меняющимися данными." } },
  "networking":           { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How a message gets from one computer to another across the world.", ru: "Как сообщение попадает с одного компьютера на другой через весь мир." } },
  "observability":        { title: { en: "Orientation", ru: "Введение" }, crux: { en: "How you find out what your running system is actually doing.", ru: "Как узнать, что на самом деле делает работающая система." } },
  "performance":          { title: { en: "Orientation", ru: "Введение" }, crux: { en: "Why software gets slow and how to find the real reason.", ru: "Почему софт тормозит и как найти настоящую причину." } },
  "queues":               { title: { en: "Orientation", ru: "Введение" }, crux: { en: "Why systems pass work through a line instead of doing it on the spot.", ru: "Почему системы передают работу через очередь, а не делают её сразу." } },
  "security":             { title: { en: "Orientation", ru: "Введение" }, crux: { en: "Why every system is attacked and what 'safe enough' means.", ru: "Почему любую систему атакуют и что значит «достаточно безопасно»." } },
};

/** Pure: returns a new units array with `track` renumbered + orientation inserted. Idempotent. */
export function transform(units, track, meta) {
  if (units.some((u) => u.track === track && u.slug === "00-orientation")) return units;
  const out = units.map((u) => (u.track === track ? { ...u, order: u.order + 1 } : u));
  out.push({
    slug: "00-orientation",
    track,
    order: 1,
    title: meta.title,
    crux: meta.crux,
    lessons: ["01-orientation"],
  });
  return out;
}

export function transformAll(units) {
  let u = units;
  for (const t of FULLSTACK) u = transform(u, t, ORIENTATION[t]);
  return u;
}

// Runner: node scripts/zero-band-renumber.mjs
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const path = new URL("../src/content/units.json", import.meta.url);
  const units = JSON.parse(readFileSync(path, "utf8"));
  const next = transformAll(units);
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
  console.log(`units.json: ${units.length} -> ${next.length} units`);
}
