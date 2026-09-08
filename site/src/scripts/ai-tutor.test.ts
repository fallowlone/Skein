import { describe, expect, it, vi } from "vitest";

vi.mock("~/english/byok/converse", () => ({
  postMessages: vi.fn(async (body: any) => ({
    content: [{ text: body.messages[0].content ? "ask one question" : "" }],
  })),
}));

vi.mock("~/english/byok", () => ({
  withKey: vi.fn(),
}));

vi.mock("~/scripts/practice-state", () => ({
  readAttempts: vi.fn(() => ({ broken: { attempts: 2, passes: 0, lastResult: "fail", lastAt: 30 } })),
  readSelfGrades: vi.fn(() => ({ explain: "partial" })),
}));
vi.mock("~/scripts/review-state", () => ({
  allCards: vi.fn(() => [{ cardKey: "lesson::retrieval::0", lessonKey: "lesson", lastGrade: "again", lastReviewedAt: 20 }]),
}));
vi.mock("~/scripts/user-state", () => ({
  userState: { value: { retrievalRatings: { lesson: { grade: "again", lastAt: 40, attempts: 1 } } } },
}));

import { askTutor, MAX_TUTOR_MESSAGES, recentMistakes } from "./ai-tutor";

describe("askTutor", () => {
  it("sends lesson, concepts and mastery context to the tutor prompt", async () => {
    const { postMessages } = await import("~/english/byok/converse");

    const result = await askTutor({
      mode: "debugging",
      lessonKey: "closures",
      concepts: ["scope", "memory"],
      mastery: { scope: 0.45 },
      question: "Why is this variable undefined?",
    });

    expect(result).toBe("ask one question");
    expect(postMessages).toHaveBeenCalledOnce();
    const body = vi.mocked(postMessages).mock.calls[0][0] as any;
    expect(body.system[0].text).toContain("closures");
    expect(body.system[0].text).toContain("scope");
    expect(body.system[0].text).toContain("0.45");
  });

  it("keeps follow-up context bounded and asks for a minimal hint without revealing the solution", async () => {
    const { postMessages } = await import("~/english/byok/converse");
    const conversation = Array.from({ length: 12 }, (_, index) => ({
      role: index % 2 === 0 ? "user" as const : "assistant" as const,
      content: `turn-${index}`,
    }));

    await askTutor({
      mode: "hint",
      lang: "ru",
      lessonKey: "closures",
      concepts: ["scope"],
      question: "Моя следующая попытка",
      conversation,
    });

    const body = vi.mocked(postMessages).mock.calls.at(-1)![0] as any;
    expect(body.messages).toHaveLength(MAX_TUTOR_MESSAGES);
    expect(body.messages[0].content).toBe("turn-5");
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "Моя следующая попытка" });
    expect(body.system[0].text).toContain("Respond in Russian");
    expect(body.system[0].text).toContain("smallest useful hint");
    expect(body.system[0].text).toContain("Never provide a complete solution");
  });

  it("allows a complete solution only in explicit worked-example mode", async () => {
    const { postMessages } = await import("~/english/byok/converse");

    await askTutor({
      mode: "worked-example",
      lang: "en",
      lessonKey: "closures",
      concepts: ["scope"],
      question: "I tried tracing the scopes but got stuck.",
    });

    const body = vi.mocked(postMessages).mock.calls.at(-1)![0] as any;
    expect(body.system[0].text).toContain("complete worked solution");
    expect(body.system[0].text).toContain("only because the learner explicitly selected Worked example");
  });

  it("fills recent mistakes from existing lesson data when omitted", async () => {
    const { postMessages } = await import("~/english/byok/converse");

    await askTutor({ mode: "hint", lessonKey: "lesson", concepts: [], question: "Help" });

    const body = vi.mocked(postMessages).mock.calls.at(-1)![0] as any;
    expect(body.system[0].text).toContain('"source":"retrieval"');
    expect(body.system[0].text).toContain('"key":"lesson"');
  });

  it("derives recent mistakes from practice, self-grade and review records", () => {
    expect(recentMistakes("lesson", 100)).toEqual([
      { source: "retrieval", key: "lesson", detail: "again", at: 40 },
      { source: "practice", key: "broken", detail: "failed (2 attempts)", at: 30 },
      { source: "review", key: "lesson::retrieval::0", detail: "reviewed again", at: 20 },
      { source: "self-grade", key: "explain", detail: "partial", at: 0 },
    ]);
  });
});
