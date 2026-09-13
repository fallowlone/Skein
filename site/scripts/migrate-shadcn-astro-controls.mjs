import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = new URL("../src/", import.meta.url);
const controls = [
  ["button", "ShadcnButton", 'import { Button as ShadcnButton } from "~/components/ui/button";'],
  ["input", "ShadcnInput", 'import { Input as ShadcnInput } from "~/components/ui/input";'],
  ["textarea", "ShadcnTextarea", 'import { Textarea as ShadcnTextarea } from "~/components/ui/textarea";'],
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.name.endsWith(".astro")) files.push(full);
  }
  return files;
}

for (const file of await walk(root.pathname)) {
  let source = await readFile(file, "utf8");
  const imports = [];

  for (const [tag, component, importLine] of controls) {
    const open = new RegExp(`<${tag}\\b`, "g");
    const close = new RegExp(`</${tag}>`, "g");
    if (!open.test(source)) continue;
    open.lastIndex = 0;
    source = source.replace(open, `<${component}`).replace(close, `</${component}>`);
    imports.push(importLine);
  }

  if (!imports.length) continue;
  const block = `${imports.join("\n")}\n`;
  if (source.startsWith("---\n")) {
    source = `---\n${block}${source.slice(4)}`;
  } else {
    source = `---\n${block}---\n${source}`;
  }
  await writeFile(file, source);
}
