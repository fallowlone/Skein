// Builds the args JSON for grade.workflow.js from the worklist + the typed rubric.
// Run: bun scripts/depth-audit/grade-args.ts > /tmp/grade-args.json   (from site/)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { GRADE_TOOL_SCHEMA, buildUnitPrompt } from "./rubric";
import type { UnitRef } from "./types";

const worklist: UnitRef[] = JSON.parse(
  await readFile(fileURLToPath(new URL("./worklist.json", import.meta.url)), "utf8"),
);

// guide = the shared preface (dimensions + instructions), reusing buildUnitPrompt's
// header on an empty unit and dropping the unit-specific lesson list.
const guide = buildUnitPrompt({ unitKey: "<unit>", track: "", unit: "", lessons: [] } as UnitRef)
  .split("\nLessons in this unit:")[0];

process.stdout.write(JSON.stringify({ units: worklist, model: "sonnet", schema: GRADE_TOOL_SCHEMA, guide }));
