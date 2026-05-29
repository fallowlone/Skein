#!/usr/bin/env node
// Out-of-band drill validator. NOT part of the build — run manually / quarterly.
// Validates every drill problem against LeetCode's public GraphQL endpoint:
//   - OK           : slug resolves AND leetcodeId + difficulty match our JSON
//   - DEAD         : slug no longer resolves (question === null) — re-curate
//   - MISMATCH     : slug resolves but our leetcodeId/difficulty is stale
//   - INCONCLUSIVE : non-200 / network error (rate-limited, offline) — warn only
// Usage: node scripts/check-drill-links.mjs
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("../site/src/content/drill", import.meta.url).pathname;
const GQL = "https://leetcode.com/graphql";
const QUERY = "query($s:String!){question(titleSlug:$s){questionFrontendId difficulty}}";

async function walk(dir) {
  const out = [];
  for (const i of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name.endsWith(".json")) out.push(p);
  }
  return out;
}

async function lookup(slug) {
  const res = await fetch(GQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0" },
    body: JSON.stringify({ query: QUERY, variables: { s: slug } }),
  });
  if (res.status !== 200) return { state: "INCONCLUSIVE", detail: `HTTP ${res.status}` };
  const q = (await res.json())?.data?.question ?? null;
  return q ? { state: "OK", q } : { state: "DEAD" };
}

const files = await walk(ROOT);
let dead = 0, mismatch = 0, inconclusive = 0, total = 0;
for (const f of files) {
  const data = JSON.parse(await readFile(f, "utf8"));
  for (const p of data.problems ?? []) {
    total++;
    try {
      const r = await lookup(p.slug);
      if (r.state === "DEAD") {
        dead++; console.log(`DEAD          #${p.leetcodeId} ${p.title} (slug "${p.slug}" no longer resolves)`);
      } else if (r.state === "INCONCLUSIVE") {
        inconclusive++; console.log(`INCONCLUSIVE  ${r.detail}  #${p.leetcodeId} ${p.title}`);
      } else {
        const idOk = String(r.q.questionFrontendId) === String(p.leetcodeId);
        const diffOk = String(r.q.difficulty).toLowerCase() === String(p.difficulty).toLowerCase();
        if (!idOk || !diffOk) {
          mismatch++;
          console.log(`MISMATCH      ${p.slug}: ours #${p.leetcodeId}/${p.difficulty} vs LeetCode #${r.q.questionFrontendId}/${r.q.difficulty}`);
        }
      }
    } catch (e) {
      inconclusive++; console.log(`INCONCLUSIVE  ${String(e).slice(0, 60)}  #${p.leetcodeId} ${p.title}`);
    }
    await new Promise((r) => setTimeout(r, 350)); // be polite
  }
}

const broken = dead + mismatch;
console.log(`\n${total - broken - inconclusive}/${total} OK` +
  (dead ? ` · ${dead} DEAD` : "") +
  (mismatch ? ` · ${mismatch} MISMATCH` : "") +
  (inconclusive ? ` · ${inconclusive} inconclusive (rate-limited/offline — re-run)` : ""));
// Only fail on real problems (dead/mismatch). Inconclusive must not break a CI cron.
process.exit(broken ? 1 : 0);
