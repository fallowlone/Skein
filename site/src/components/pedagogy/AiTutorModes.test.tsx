import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const postMessages = vi.hoisted(() => vi.fn(async () => ({ content: [{ text: "Use an invariant." }] })));
const masteryState = new Map([["scope", { confidence: 0.7, source: "declared" as const, lastAt: 1 }]]);

vi.mock("~/english/byok/converse", () => ({ postMessages }));
vi.mock("~/english/byok", () => ({ withKey: vi.fn() }));
vi.mock("~/scripts/practice-state", () => ({
  readAttempts: vi.fn(() => ({})),
  readSelfGrades: vi.fn(() => ({})),
}));
vi.mock("~/scripts/review-state", () => ({ allCards: vi.fn(() => []) }));
vi.mock("~/scripts/path/path-io", () => ({ effectiveKnowledge: () => masteryState }));

import AiTutorModes from "./AiTutorModes";
import { resetAll, userState } from "~/scripts/user-state";

let host: HTMLDivElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  localStorage.clear();
  resetAll();
  postMessages.mockClear();
});

afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
});

async function ask(question = "How should I debug this?") {
  const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
  textarea.value = question;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  (Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Ask")) as HTMLButtonElement).click();
  await flush();
  await flush();
}

describe("AiTutorModes runtime wiring", () => {
  it.each([
    ["with practice", true],
    ["without practice", false],
  ])("hydrates %s and exposes all four tutor modes", async (_label, hasPractice) => {
    render(
      <div>
        {hasPractice && <div data-practice-layer="lesson" />}
        <AiTutorModes lang="en" lessonKey="track/unit/lesson" concepts={["scope"]} />
      </div>,
      host,
    );

    expect(host.querySelector('[aria-label="AI tutor modes"]')).not.toBeNull();
    expect(Array.from(host.querySelectorAll("button")).filter((button) => button.getAttribute("aria-pressed") !== null)).toHaveLength(4);
    for (const label of ["Debugging coach", "Interview simulation", "Hint mode", "Socratic tutor"]) {
      const button = Array.from(host.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes(label)) as HTMLButtonElement;
      button.click();
      await flush();
      expect(button.getAttribute("aria-pressed")).toBe("true");
    }
  });

  it("persists a successful BYOK exchange without changing mastery", async () => {
    render(<AiTutorModes lang="en" lessonKey="track/unit/lesson" concepts={["scope"]} />, host);
    const before = masteryState.get("scope")?.confidence;

    await ask();

    expect(postMessages).toHaveBeenCalledOnce();
    expect(host.textContent).toContain("Use an invariant.");
    expect(userState.value.tutorHistory).toHaveLength(1);
    expect(userState.value.tutorHistory?.[0]).toMatchObject({
      lessonKey: "track/unit/lesson",
      mode: "socratic",
      question: "How should I debug this?",
      concepts: ["scope"],
    });
    expect(masteryState.get("scope")?.confidence).toBe(before);
    expect((userState.value as any).conceptMastery).toBeUndefined();
  });
});
