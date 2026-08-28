#!/usr/bin/env bun
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarketDemandSnapshot, type JobPosting, type SkillDefinition } from "../../src/scripts/path/market-demand-build";

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../../src/content/path/market-demand.json");
const USER_AGENT = "Learnvane market-signal bot (https://fallowlone.com; public API ingestion)";
const WINDOW_DAYS = Number(process.env.MARKET_WINDOW_DAYS ?? 30);

const SKILLS: SkillDefinition[] = [
  { id: "typescript", aliases: ["typescript"], tracks: ["typescript"], concepts: ["typescript-everyday-types"] },
  { id: "javascript", aliases: ["javascript", "ecmascript"], tracks: ["js-engine"], concepts: ["javascript-runtime"] },
  { id: "react", aliases: ["react.js", "reactjs", "react"], tracks: ["react", "frontend"], concepts: ["react-reconciliation"] },
  { id: "nextjs", aliases: ["next.js", "nextjs"], tracks: ["nextjs", "frontend"], concepts: ["nextjs-rendering-modes"] },
  { id: "nodejs", aliases: ["node.js", "nodejs"], tracks: ["node", "backend"], concepts: ["node"] },
  { id: "python", aliases: ["python"], tracks: ["python", "backend"], concepts: ["python-use-cases"] },
  { id: "golang", aliases: ["golang", "go developer", "go engineer"], tracks: ["go", "backend"], concepts: ["go-types"] },
  { id: "postgresql", aliases: ["postgresql", "postgres"], tracks: ["sql-postgres", "databases"], concepts: ["sql"] },
  { id: "sql", aliases: ["sql"], tracks: ["sql-postgres", "databases"], concepts: ["sql"] },
  { id: "redis", aliases: ["redis"], tracks: ["caching"], concepts: ["redis-cluster"] },
  { id: "kafka", aliases: ["apache kafka", "kafka"], tracks: ["queues", "distributed"], concepts: ["kafka-idempotent-producer"] },
  { id: "graphql", aliases: ["graphql"], tracks: ["apis"], concepts: ["graphql"] },
  { id: "grpc", aliases: ["grpc"], tracks: ["apis", "networking"], concepts: ["grpc"] },
  { id: "docker", aliases: ["docker", "containers"], tracks: ["docker"], concepts: ["dockerignore-and-healthcheck"] },
  { id: "kubernetes", aliases: ["kubernetes", "k8s"], tracks: ["docker", "deployment"], concepts: [] },
  { id: "aws", aliases: ["amazon web services", "aws"], tracks: ["aws"], concepts: ["aws-alb"] },
  { id: "terraform", aliases: ["terraform"], tracks: ["deployment", "aws"], concepts: ["terraform"] },
  { id: "cicd", aliases: ["ci/cd", "continuous integration"], tracks: ["ci-cd"], concepts: ["ci"] },
  { id: "observability", aliases: ["observability", "opentelemetry"], tracks: ["observability"], concepts: ["observability"] },
  { id: "security", aliases: ["application security", "appsec", "owasp"], tracks: ["security", "security-defensive"], concepts: ["security-headers"] },
  { id: "system-design", aliases: ["system design", "distributed systems"], tracks: ["system-design", "distributed"], concepts: ["capacity-planning"] },
];

async function getJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

const text = (value: unknown) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

async function fetchRemotive(): Promise<JobPosting[]> {
  const payload = await getJson("https://remotive.com/api/remote-jobs?category=software-dev&limit=1000");
  return (payload.jobs ?? []).map((job: any) => ({
    source: "remotive", id: String(job.id), title: text(job.title), description: text(job.description), publishedAt: job.publication_date,
  }));
}

async function fetchArbeitnow(): Promise<JobPosting[]> {
  const jobs: JobPosting[] = [];
  for (let page = 1; page <= 5; page++) {
    const payload = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
    for (const job of payload.data ?? []) jobs.push({
      source: "arbeitnow", id: String(job.slug), title: text(job.title), description: text(job.description), publishedAt: job.created_at,
    });
    if (!payload.links?.next) break;
  }
  return jobs;
}

async function fetchHeadHunter(): Promise<JobPosting[]> {
  const jobs: JobPosting[] = [];
  for (let page = 0; page < 5; page++) {
    const payload = await getJson(`https://api.hh.ru/vacancies?professional_role=96&per_page=100&page=${page}&order_by=publication_time`);
    for (const job of payload.items ?? []) jobs.push({
      source: "headhunter", id: String(job.id), title: text(job.name),
      description: text(`${job.snippet?.requirement ?? ""} ${job.snippet?.responsibility ?? ""}`), publishedAt: job.published_at,
    });
    if (page + 1 >= Number(payload.pages ?? 0)) break;
  }
  return jobs;
}

async function fetchAdzuna(): Promise<JobPosting[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const url = new URL("https://api.adzuna.com/v1/api/jobs/gb/search/1");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("results_per_page", "100");
  url.searchParams.set("category", "it-jobs");
  url.searchParams.set("sort_by", "date");
  const payload = await getJson(url.toString());
  return (payload.results ?? []).map((job: any) => ({
    source: "adzuna", id: String(job.id), title: text(job.title), description: text(job.description), publishedAt: job.created,
  }));
}

const settled = await Promise.allSettled([fetchRemotive(), fetchArbeitnow(), fetchHeadHunter(), fetchAdzuna()]);
const jobs: JobPosting[] = [];
for (const result of settled) {
  if (result.status === "fulfilled") jobs.push(...result.value);
  else console.warn(`market demand: source skipped: ${result.reason instanceof Error ? result.reason.message : result.reason}`);
}
if (!jobs.length) throw new Error("market demand: every source failed or returned no jobs; keeping the previous snapshot");

const snapshot = buildMarketDemandSnapshot(jobs, SKILLS, new Date().toISOString(), WINDOW_DAYS);
await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.info(`market demand: wrote ${snapshot.sampleSize} current jobs from ${snapshot.sources.length} sources to ${OUTPUT}`);
