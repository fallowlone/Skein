import { mkdir, readFile, writeFile } from "node:fs/promises";

// Minimal evaluator for the exact expression shapes used in db-join figures:
// {t.key}, {dict.en.x}, {NUM/ARR consts}, arithmetic, ternaries,
// and {ARR.map((a, i) => (<jsx>))} unrolling.
function parseDict(src) {
  const out = { en: {}, ru: {} };
  for (const lang of ["en", "ru"]) {
    const m = src.match(new RegExp(lang + ":\\s*\\{([\\s\\S]*?)\\n  \\},"));
    const body = m[1];
    for (const fm of body.matchAll(/(\w+):\s*"([^"]*)"/g)) out[lang][fm[1]] = fm[2];
    for (const fm of body.matchAll(/(\w+):\s*\[([^\]]*)\]/g))
      out[lang][fm[1]] = [...fm[2].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
  }
  return out;
}

function parseConsts(src) {
  const scope = {};
  for (const m of src.matchAll(/const (\w+) = (\[[^\]]*\]|-?[\d.]+);/g)) {
    try { scope[m[1]] = JSON.parse(m[2]); } catch { /* skip */ }
  }
  return scope;
}

function makeEval(scope) {
  const keys = Object.keys(scope);
  const vals = keys.map((k) => scope[k]);
  return (expr) => Function(...keys, `"use strict"; return (${expr});`)(...vals);
}

function findMatching(s, start, open, close) {
  let d = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === open) d++;
    else if (s[i] === close) { d--; if (d === 0) return i; }
  }
  return -1;
}

function wordReplace(s, name, val) {
  return s.replace(new RegExp(`\\b${name}\\b`, "g"), val);
}

function unrollMaps(svg, evalExpr) {
  let out = svg;
  for (;;) {
    const m = out.match(/\{([A-Za-z_$][\w$.[\]]*)\.map\(\(([^)]*)\)\s*=>\s*\(/);
    if (!m) break;
    const braceOpen = m.index;
    const parenOpen = out.indexOf("(", braceOpen + m[0].length - 1);
    const parenClose = findMatching(out, parenOpen, "(", ")");
    const braceClose = out.indexOf(")}", parenClose);
    if (parenClose < 0 || braceClose < 0) throw new Error("unbalanced map at " + braceOpen);
    const arrExpr = m[1];
    const params = m[2].split(",").map((p) => p.trim());
    const inner = out.slice(parenOpen + 1, parenClose);
    const arr = evalExpr(arrExpr);
    if (!Array.isArray(arr)) throw new Error(arrExpr + " is not an array");
    const rendered = arr.map((item, i) => {
      let t = inner;
      // Whole-brace loop-var refs become placeholders first, so the later
      // whole-word substitution cannot rewrite already-inserted values.
      const aName = params[0];
      const ph = `@@L${aName}${i}@@`;
      t = t.split(`{${aName}}`).join(ph);
      if (params[1]) {
        t = t.split(`{${params[1]}}`).join(String(i));
        t = wordReplace(t, params[1], String(i));
      }
      t = wordReplace(t, aName, JSON.stringify(item));
      t = t.split(ph).join(String(item));
      return t;
    }).join("\n");
    out = out.slice(0, braceOpen) + rendered + out.slice(braceClose + 2);
  }
  return out;
}

function evalBraces(svg, evalExpr) {
  return svg.replace(/\{([^{}]+)\}/g, (_, expr) => String(evalExpr(expr)));
}

const COLORS = {
  "var(--ink)": "#1a1a18",
  "var(--muted)": "#6f6f66",
  "var(--card)": "#f3f1ea",
  "var(--paper)": "#ffffff",
  "var(--accent)": "#c2410c",
  "var(--font-mono)": "monospace",
  "var(--font-display)": "sans-serif",
};

// Usage: bun scripts/figure-qa/render-figures.mjs <en|ru> <figure...> [--out dir]
// Evaluates the small Astro-expression subset used by lesson figures
// ({t.key}, consts, arithmetic, ternaries, {arr.map((a,i) => (<jsx>))})
// and writes standalone SVGs. Rasterize with sharp (bundles librsvg):
//   node -e "const s=require('sharp');(async()=>{for(const f of [...]){await s(f,{density:144}).flatten({background:'#ffffff'}).png().toFile(f+'.png')}})()"
const args = process.argv.slice(2);
const lang = args[0] || "en";
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : "/tmp/figshots";
const files = args.filter((a) => a.endsWith(".astro"));
for (const f of files) {
  const src = await readFile(f, "utf8");
  const dict = parseDict(src);
  const scope = { t: dict[lang], dict, ...parseConsts(src) };
  const evalExpr = makeEval(scope);
  let svg = src.slice(src.indexOf("<svg"), src.indexOf("</svg>") + 6);
  svg = unrollMaps(svg, evalExpr);
  svg = evalBraces(svg, evalExpr);
  // JSX allows unquoted attrs; XML does not — quote bare values.
  svg = svg.replace(/([\w:-]+)=([^"'\s>][^>\s]*)/g, '$1="$2"');
  if (/\{|\}/.test(svg.replace(/<title>[\s\S]*?<\/title>/g, "")))
    throw new Error("unresolved braces in " + f);
  for (const [k, v] of Object.entries(COLORS)) svg = svg.split(k).join(v);
  svg = svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="800" ');
  const name = f.split("/").pop().replace(".astro", `-${lang}.svg`);
  await mkdir(outDir, { recursive: true });
  await writeFile(`${outDir}/${name}`, svg);
  console.log("wrote", name);
}
