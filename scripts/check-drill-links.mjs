#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const ROOT = new URL("../site/src/content/drill", import.meta.url).pathname;
async function walk(dir) {
  const out = [];
  for (const i of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, i.name);
    if (i.isDirectory()) out.push(...(await walk(p)));
    else if (i.name.endsWith(".json")) out.push(p);
  }
  return out;
}
const files = await walk(ROOT);
let bad = 0, total = 0;
for (const f of files) {
  const data = JSON.parse(await readFile(f, "utf8"));
  for (const p of data.problems ?? []) {
    total++;
    const url = `https://leetcode.com/problems/${p.slug}/`;
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "manual" });
      if (res.status >= 400) { bad++; console.log(`DEAD  ${res.status}  #${p.leetcodeId} ${p.title} -> ${url}`); }
      else if (res.status >= 300) { bad++; console.log(`MOVED ${res.status}  #${p.leetcodeId} ${p.title} -> ${url}`); }
    } catch (e) { bad++; console.log(`ERR   ${String(e).slice(0, 60)}  #${p.leetcodeId} ${p.title}`); }
    await new Promise((r) => setTimeout(r, 250));
  }
}
console.log(`\n${total - bad}/${total} links OK${bad ? ` -- ${bad} need re-curation` : ""}`);
process.exit(bad ? 1 : 0);
