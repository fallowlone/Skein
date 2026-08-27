#!/usr/bin/env bun
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: tool [--filter <pat>] [--count] [--slice <a:b>] [file]");
  process.exit(0);
}
let filter: string | null = null;
let count = false;
let slice: [number, number] | null = null;
let file: string | null = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--filter") { filter = args[++i]; if (!filter) { console.error("missing pattern"); process.exit(2); } }
  else if (a === "--count") count = true;
  else if (a === "--slice") {
    const v = args[++i];
    const m = v?.match(/^(\d+):(\d+)$/);
    if (!m) { console.error("bad --slice range, expected start:end"); process.exit(2); }
    slice = [Number(m[1]), Number(m[2])];
    if (slice[0] < 1 || slice[1] < slice[0]) { console.error("bad slice range"); process.exit(2); }
  }
  else if (a.startsWith("--")) { console.error(`unknown flag ${a}`); process.exit(2); }
  else file = a;
}

async function* linesFrom(source: NodeJS.ReadableStream): AsyncGenerator<string> {
  const rl = createInterface({ input: source as any, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

async function main() {
  let input: NodeJS.ReadableStream;
  if (file) {
    if (!existsSync(file)) { console.error(`file not found: ${file}`); process.exit(1); }
    input = createReadStream(file);
  } else {
    input = process.stdin;
  }
  let lines: string[] = [];
  for await (const line of linesFrom(input)) lines.push(line);
  if (filter !== null) lines = lines.filter(l => l.includes(filter!));
  if (slice) lines = lines.slice(slice[0]-1, slice[1]);
  if (count) console.log(String(lines.length));
  else for (const l of lines) console.log(l);
}
main();
