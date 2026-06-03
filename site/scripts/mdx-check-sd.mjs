import { compile } from "@mdx-js/mdx";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
async function walk(d){const o=[];for(const e of await readdir(d,{withFileTypes:true})){const p=join(d,e.name);if(e.isDirectory())o.push(...await walk(p));else if(e.name==="index.mdx")o.push(p);}return o;}
let bad=0,ok=0;
for(const root of ["src/content/lessons/en/system-design","src/content/lessons/ru/system-design"]){
  for(const f of await walk(root)){
    const src=await readFile(f,"utf8");
    // strip frontmatter (--- ... ---) so MDX doesn't choke on YAML
    const body=src.replace(/^---\n[\s\S]*?\n---\n/,"");
    try{ await compile(body,{}); ok++; }
    catch(e){ bad++; console.log("✗",f.replace("src/content/lessons/",""),"\n   ",String(e.message).split("\n")[0]); }
  }
}
console.log(`\n${ok} ok, ${bad} parse failures`);
process.exit(bad?1:0);
