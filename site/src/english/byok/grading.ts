// site/src/english/byok/grading.ts
// Defensive parser for the grading JSON contract. Tolerates code-fences / prose
// around the JSON; returns null on any shape mismatch.
import type { GradingResult } from "~/english/types";

const BANDS = ["A2", "B1", "B2", "C1"];

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  try { return JSON.parse(candidate); } catch { return null; }
}

export function parseGrading(text: string): GradingResult | null {
  const o = extractJson(text) as any;
  if (!o || typeof o !== "object") return null;
  if (!Array.isArray(o.corrections)) return null;
  const correctionsOk = o.corrections.every(
    (c: any) => c && typeof c.before === "string" && typeof c.after === "string" && typeof c.why === "string",
  );
  if (!correctionsOk) return null;
  if (typeof o.betterVersion !== "string") return null;
  if (!BANDS.includes(o.scoreBand)) return null;
  if (!Array.isArray(o.noticingHints) || !o.noticingHints.every((h: any) => typeof h === "string")) return null;
  return {
    corrections: o.corrections.map((c: any) => ({ before: c.before, after: c.after, why: c.why })),
    betterVersion: o.betterVersion,
    scoreBand: o.scoreBand,
    noticingHints: o.noticingHints,
  };
}
