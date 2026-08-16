import type { InterviewLevel } from "~/types/interview";

export const INTERVIEW_LEVELS: InterviewLevel[] = ["junior", "middle", "senior"];

export type InterviewAnswerLevels = Record<InterviewLevel, string>;

export type InterviewAnswerBlock =
  | { kind: "heading" | "paragraph" | "rule"; text: string }
  | { kind: "code"; language: string; text: string };

const CODE_LANGUAGES = new Set([
  "bash", "css", "dockerfile", "graphql", "html", "javascript", "json",
  "jsx", "js", "python", "ruby", "shell", "sql", "tsx", "typescript", "yaml",
]);

const HEADINGS = new Set([
  "Theory", "TL;DR", "Quick example", "Key difference", "When to use",
  "Comparison table", "How the browser handles this", "Common mistakes",
  "Real-world usage", "Follow-up questions", "Examples", "Short Answer",
  "Interview ready", "Lazy loading vs eager loading", "Route parameters",
  "Guards", "Resolvers", "Nested routes", "Error handling", "Performance",
]);

function cleanCode(tokens: string[]): string {
  return tokens
    .join(" ")
    .replace(/\s+([,;:\]})])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([.])/g, "$1")
    .replace(/<\s+/g, "<")
    .replace(/\s+>/g, ">")
    .replace(/\s*;\s*/g, ";\n")
    .replace(/\s*}\s*/g, "\n}\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeInlineText(text: string): string {
  return text
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+=\s+/g, " = ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function looksLikeProse(block: string): boolean {
  return /^[A-Za-z][^{};]*\s/.test(block) && /[.!?:]$/.test(block.trim());
}

function startsProse(block: string): boolean {
  return /^(Navigate to|When |If |This |The |A |An |For |Use |Why |Without |In |snapshot\.)/.test(block);
}

/** Convert the scraper's token-separated answer text into lesson-like blocks. */
export function parseInterviewAnswer(answer: string): InterviewAnswerBlock[] {
  const rawBlocks = answer.split(/\n\s*\n/g).map((block) => block.trim()).filter(Boolean);
  const blocks: InterviewAnswerBlock[] = [];
  let i = 0;

  // The answer lead is split into a title and its one-sentence definition.
  const preamble: string[] = [];
  while (i < rawBlocks.length && rawBlocks[i] !== "#") {
    if (HEADINGS.has(rawBlocks[i]) || CODE_LANGUAGES.has(rawBlocks[i])) break;
    preamble.push(rawBlocks[i++]);
  }
  if (preamble.length) blocks.push({ kind: "paragraph", text: preamble.join(" ") });

  while (i < rawBlocks.length) {
    const block = rawBlocks[i];
    if (block === "#") {
      blocks.push({ kind: "rule", text: "" });
      i += 1;
      continue;
    }
    if (HEADINGS.has(block) || block.startsWith("Mistake ")) {
      blocks.push({ kind: "heading", text: block });
      i += 1;
      continue;
    }
    if (CODE_LANGUAGES.has(block) && rawBlocks[i + 1] === "Copy") {
      const language = block;
      i += 2;
      const tokens: string[] = [];
      while (i < rawBlocks.length) {
        const next = rawBlocks[i];
        if (next === "#" || HEADINGS.has(next) || next.startsWith("Mistake ")) break;
        if (CODE_LANGUAGES.has(next) && rawBlocks[i + 1] === "Copy" && tokens.length) break;
        if (tokens.length > 4 && (looksLikeProse(next) || startsProse(next))) break;
        tokens.push(next);
        i += 1;
        if (tokens.length > 4 && /[;}\])]$/.test(next) && looksLikeProse(rawBlocks[i] ?? "")) break;
      }
      blocks.push({ kind: "code", language, text: cleanCode(tokens) });
      continue;
    }
    let paragraph = block;
    i += 1;
    while (i < rawBlocks.length) {
      const next = rawBlocks[i];
      if (next === "#" || HEADINGS.has(next) || next.startsWith("Mistake ") || CODE_LANGUAGES.has(next)) break;
      if (
        /^[a-z/{[(/=),:;!?)]/.test(next)
        || /[,;:(]$/.test(paragraph)
        || (next.endsWith(")") && paragraph.includes("("))
        || (next === "." && (paragraph.includes("=") || paragraph.includes("://")))
        || paragraph === "Use"
        || paragraph === "Wildcard"
        || paragraph === "Navigate to"
      ) {
        paragraph += ` ${next}`;
        i += 1;
        continue;
      }
      break;
    }
    blocks.push({ kind: "paragraph", text: normalizeInlineText(paragraph) });
  }
  return blocks;
}

/**
 * Keep the complete imported answer available at every interview level.
 * The source answer already contains the foundation, examples, trade-offs,
 * mistakes, follow-ups, and production cases; the selector changes the
 * interview target without hiding any of that material.
 */
export function buildInterviewAnswerLevels(answer: string): InterviewAnswerLevels {
  return { junior: answer, middle: answer, senior: answer };
}
