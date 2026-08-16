import { describe, expect, test } from "vitest";
import interviewData from "~/data/interview-questions.json";
import {
  INTERVIEW_LEVELS,
  buildInterviewAnswerLevels,
  parseInterviewAnswer,
  type InterviewAnswerLevels,
} from "./interview-answers";

describe("interview answer levels", () => {
  test("keeps the complete source answer at every selected level", () => {
    const answer = [
      "Core definition",
      "#",
      "Working example",
      "#",
      "Production trade-offs",
      "#",
      "Failure modes",
    ].join("\n\n");

    const levels = buildInterviewAnswerLevels(answer);

    expect(Object.keys(levels)).toEqual(INTERVIEW_LEVELS);
    expect(levels.junior).toBe(answer);
    expect(levels.middle).toBe(answer);
    expect(levels.senior).toBe(answer);
  });

  test("keeps short answers available at every level", () => {
    const answer = "One concise answer.";
    const levels: InterviewAnswerLevels = buildInterviewAnswerLevels(answer);

    expect(levels.junior).toBe(answer);
    expect(levels.middle).toBe(answer);
    expect(levels.senior).toBe(answer);
  });

  test("covers every imported interview question", () => {
    const questions = Object.values(interviewData).flatMap((category) => category.questions);

    expect(questions).toHaveLength(564);
    expect(questions.every((question) => question.answer.trim().length > 0)).toBe(true);
    expect(questions.every((question) => {
      const levels = buildInterviewAnswerLevels(question.answer);
      return INTERVIEW_LEVELS.every((level) => levels[level].trim().length > 0);
    })).toBe(true);
  });

  test("turns scraped answer text into readable lesson blocks", () => {
    const blocks = parseInterviewAnswer([
      "Angular Router",
      "maps URL paths to components.",
      "#",
      "TL;DR",
      "Use loadComponent for one standalone component.",
      "#",
      "Quick example",
      "typescript",
      "Copy",
      "export",
      "const",
      "routes",
      ":",
      "Routes",
      "=",
      "[",
      "]",
      ";",
    ].join("\n\n"));

    expect(blocks).toEqual([
      { kind: "paragraph", text: "Angular Router maps URL paths to components." },
      { kind: "rule", text: "" },
      { kind: "heading", text: "TL;DR" },
      { kind: "paragraph", text: "Use loadComponent for one standalone component." },
      { kind: "rule", text: "" },
      { kind: "heading", text: "Quick example" },
      { kind: "code", language: "typescript", text: "export const routes: Routes = [];" },
    ]);
  });

  test("joins inline code fragments instead of rendering stray parentheses", () => {
    const blocks = parseInterviewAnswer([
      "TL;DR",
      "Daemon (",
      "dockerd",
      ")",
      "= long-running root process.",
      "Transport",
      "= Unix socket (",
      "/var/run/docker.sock",
      ") by default.",
    ].join("\n\n"));

    expect(blocks.map((block) => block.kind === "paragraph" ? block.text : block.kind)).toEqual([
      "heading",
      "Daemon (dockerd) = long-running root process.",
      "Transport = Unix socket (/var/run/docker.sock) by default.",
    ]);
  });
});
