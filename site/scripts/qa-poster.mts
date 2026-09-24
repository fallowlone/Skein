#!/usr/bin/env bun
// Per-diagram quality gate for AlgoPoster embeds.
// Usage: bun scripts/qa-poster.mjs <file...> — exits 1 with reasons on failure.
// Checks per file: compiles, exactly 1 AlgoPoster, props audit (steps 3-5,
// 2 minis, titleHi⊆title, step-sized data arrays), SSR render has no NaN/
// undefined attrs, pose sweep over the full loop stays in bounds.
import { readFile } from "node:fs/promises";
import { compileLessonRenderTree } from "./content/lesson-render-tree.ts";
import render from "preact-render-to-string";
import { h } from "preact";
import AlgoPoster from "../src/components/algo/AlgoPoster.tsx";
import { PATTERNS } from "../src/components/algo/poster-patterns.tsx";
import { parseHTML } from "linkedom";

const N_STEPS = (p: any) => p.steps?.length ?? 0;

function stepSized(name: string, arr: any, n: number, errs: string[]) {
  if (arr === undefined) return;
  if (!Array.isArray(arr) || arr.length !== n) {
    errs.push(`${name}.length=${Array.isArray(arr) ? arr.length : typeof arr} != steps=${n}`);
  }
}

function auditData(pattern: string, data: any, n: number, errs: string[]) {
  switch (pattern) {
    case "lane": stepSized("wins", data.wins, n, errs); stepSized("sums", data.sums, n, errs); break;
    case "bars":
      stepSized("orders", data.orders, n, errs); stepSized("hi", data.hi, n, errs); stepSized("done", data.done, n, errs);
      if (!Array.isArray(data.values) || data.values.length < 2) errs.push("values must have 2+ bars");
      break;
    case "halving": stepSized("ranges", data.ranges, n, errs); break;
    case "stack": stepSized("depths", data.depths, n, errs); break;
    case "tree":
      stepSized("visits", data.visits, n, errs); stepSized("curs", data.curs, n, errs);
      if ((data.values ?? []).length > 15) errs.push("tree values > 15 nodes");
      break;
    case "heap": stepSized("paths", data.paths, n, errs); break;
    case "graph":
      stepSized("waves", data.waves, n, errs); stepSized("dones", data.dones, n, errs); stepSized("dists", data.dists, n, errs);
      break;
    case "grid": stepSized("fills", data.fills, n, errs); stepSized("curs", data.curs, n, errs); break;
    case "buckets":
      stepSized("placed", data.placed, n, errs); stepSized("hi", data.hi, n, errs);
      if ((data.keys ?? []).length !== (data.to ?? []).length) errs.push("keys/to length mismatch");
      break;
    case "choice":
      stepSized("takes", data.takes, n, errs); stepSized("rejects", data.rejects, n, errs); stepSized("curs", data.curs, n, errs);
      break;
    case "curves": stepSized("focus", data.focus, n, errs); break;
    case "bits": stepSized("ops", data.ops, n, errs); break;
    case "pipeline": stepSized("at", data.at, n, errs); break;
    default: errs.push(`unknown pattern ${pattern}`);
  }
}

async function qaFile(f: string): Promise<string[]> {
  const errs: string[] = [];
  const raw = await readFile(f, "utf8");
  let posters: any[] = [];
  try {
    const art = await compileLessonRenderTree(raw, f);
    const visit = (ns: any[]) => {
      for (const n of ns) {
        if (n.type === "element") {
          if (n.name === "AlgoPoster") posters.push(n.props);
          if (n.children) visit(n.children);
        }
      }
    };
    visit(art.root as any[]);
  } catch (e: any) {
    return [`compile: ${e.message.slice(0, 200)}`];
  }
  if (posters.length !== 1) return [`posters=${posters.length}, want 1`];
  const p = posters[0];
  const n = N_STEPS(p);
  if (!(n >= 3 && n <= 5)) errs.push(`steps=${n}, want 3-5`);
  for (const [i, s] of (p.steps ?? []).entries()) {
    if (!s?.caption || !s?.state || !s?.log) errs.push(`steps[${i}] missing caption/state/log`);
  }
  if (!Array.isArray(p.minis) || p.minis.length !== 2) errs.push(`minis=${p.minis?.length}, want 2`);
  for (const [i, m] of (p.minis ?? []).entries()) {
    if (!m?.title || !m?.body) errs.push(`minis[${i}] missing title/body`);
    if (m?.at !== undefined && (m.at < 0 || m.at >= n)) errs.push(`minis[${i}].at out of range`);
  }
  for (const h of p.titleHi ?? []) {
    if (typeof p.title === "string" && !p.title.includes(h)) errs.push(`titleHi ${JSON.stringify(h)} not in title`);
  }
  if (!Array.isArray(p.badges) || p.badges.length < 3) errs.push("badges < 3");
  for (const k of ["id", "kicker", "lessonTag", "cost", "title", "sub", "panelTitle", "label", "takeaway", "src"]) {
    if (!p[k]) errs.push(`missing ${k}`);
  }
  if (f.includes("/ru/") && p.lang !== "ru") errs.push(`lang=${p.lang} in ru file`);
  if (f.includes("/en/") && p.lang !== "en") errs.push(`lang=${p.lang} in en file`);
  if (!PATTERNS[p.pattern as keyof typeof PATTERNS]) { errs.push(`bad pattern ${p.pattern}`); return errs; }
  auditData(p.pattern, p.data ?? {}, n, errs);

  // SSR render
  let html = "";
  try {
    html = render(h(AlgoPoster as any, p));
  } catch (e: any) {
    return [...errs, `ssr: ${e.message.slice(0, 200)}`];
  }
  if (/NaN/.test(html)) errs.push("ssr contains NaN");
  if (/="undefined"|>undefined</.test(html)) errs.push("ssr contains undefined attr");

  // Pose sweep
  try {
    const svgInner = html.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? "";
    const { document } = parseHTML(`<svg xmlns="http://www.w3.org/2000/svg">${svgInner}</svg>`);
    const root = document.querySelector("svg");
    if (!root) { errs.push("pose: no svg root"); return errs; }
    const pose = (PATTERNS as any)[p.pattern].pose;
    for (let k = 0; k <= 40; k++) pose((k / 40) * n, n, p.data, root);
    const out = root.innerHTML;
    if (/NaN/.test(out)) errs.push("pose produced NaN");
    if (/="undefined"/.test(out)) errs.push("pose produced undefined attr");
    for (const m of out.matchAll(/ y="(-?[\d.]+)"/g)) {
      const y = Number(m[1]);
      if (y < -40 || y > 400) { errs.push(`y=${y} out of bounds`); break; }
    }
    for (const m of out.matchAll(/ x="(-?[\d.]+)"/g)) {
      const x = Number(m[1]);
      if (x < -60 || x > 1040) { errs.push(`x=${x} out of bounds`); break; }
    }
    for (const m of out.matchAll(/width="(-[\d.]+)"/g)) { errs.push(`negative width ${m[1]}`); break; }
  } catch (e: any) {
    errs.push(`pose: ${e.message.slice(0, 200)}`);
  }
  return errs;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error("usage: bun scripts/qa-poster.mjs <file...>");
  process.exit(2);
}
let fail = 0;
for (const f of files) {
  const errs = await qaFile(f);
  if (errs.length) {
    fail++;
    console.log(`FAIL ${f}`);
    for (const e of errs) console.log(`  - ${e}`);
  } else {
    console.log(`OK ${f}`);
  }
}
process.exit(fail ? 1 : 0);
