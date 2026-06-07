// CLI: writes site/scripts/depth-audit/worklist.json — the input the grading Workflow reads via args.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { enumerateUnits } from "./lessons";

const siteSrc = fileURLToPath(new URL("../../src", import.meta.url));
const out = fileURLToPath(new URL("./worklist.json", import.meta.url));

const units = await enumerateUnits(siteSrc);
const lessonCount = units.reduce((n, u) => n + u.lessons.length, 0);
await writeFile(out, JSON.stringify(units, null, 2));
console.log(`worklist: ${units.length} units, ${lessonCount} lessons -> ${out}`);
