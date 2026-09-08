import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const postMessages = vi.hoisted(() => vi.fn(async (body: any) => ({
  content: [{ text: `Tutor turn ${body.messages.length}` }],
})));
const readResponses = vi.hoisted(() => vi.fn(() => ({})));
const writeResponse = vi.hoisted(() => vi.fn());
const masteryState = new Map([["scope", { confidence: 0.7, source: "declared" as const, lastAt: 1 }]]);

vi.mock("~/english/byok/converse", () => ({ postMessages }));
vi.mock("~/english/byok", () => ({ withKey: vi.fn() }));
vi.mock("~/scripts/practice-state", () => ({
  readAttempts: vi.fn(() => ({})),
  readSelfGrades: vi.fn(() => ({})),
  readResponses,
  writeResponse,
}));
vi.mock("~/scripts/review-state", () => ({ allCards: vi.fn(() => []) }));
vi.mock("~/scripts/path/path-io", () => ({ effectiveKnowledge: () => masteryState }));

import AiTutorModes from "./AiTutorModes";
import { resetAll, userState } from "~/scripts/user-state";

let host: HTMLDivElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const button = (name: string) => Array.from(host.querySelectorAll("button")).find((candidate) => candidate.textContent?.includes(name)) as HTMLButtonElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  localStorage.clear();
  resetAll();
  postMessages.mockClear();
  readResponses.mockClear();
  writeResponse.mockClear();
});

afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
});

async function enter(label: string, value: string) {
  const input = host.querySelector(`textarea[aria-label="${label}"]`) as HTMLTextAreaElement;
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
}

async function submitAttempt(value = "I traced the closure but the value still looks stale.") {
  await enter("Your attempt", value);
  button("Ask for help").click();
  await flush();
  await flush();
}

describe("AiTutorModes learning loop", () => {
  it("renders localized, labelled controls and an explicit worked-example mode", async () => {
    render(<AiTutorModes lang="ru" lessonKey="track/unit/lesson" concepts={["scope"]} />, host);

    expect(host.querySelector('[aria-label="Режимы AI-наставника"]')).not.toBeNull();
    expect(host.querySelector('textarea[aria-label="Ваша попытка"]')).not.toBeNull();
    expect(Array.from(host.querySelectorAll('button[aria-pressed]'))).toHaveLength(5);
    expect(host.textContent).toContain("Сначала опишите свою попытку");
    expect(host.textContent).not.toContain("Ask the learner one guiding question");

    button("Разобранный пример").click();
    await flush();
    expect(button("Разобранный пример").getAttribute("aria-pressed")).toBe("true");
    expect(host.textContent).toContain("полный разбор решения");
  });

  it("requires an attempt, accepts an honest don't-know, and sends bounded follow-ups through BYOK", async () => {
    render(<AiTutorModes lang="en" lessonKey="track/unit/lesson" concepts={["scope"]} />, host);

    expect(button("Ask for help").disabled).toBe(true);
    button("I don't know").click();
    await flush();
    expect((host.querySelector('textarea[aria-label="Your attempt"]') as HTMLTextAreaElement).value).toBe("I don't know yet.");
    expect(button("Ask for help").disabled).toBe(false);

    button("Ask for help").click();
    await flush();
    await flush();
    expect(postMessages).toHaveBeenCalledOnce();
    expect((postMessages.mock.calls[0][0] as any).messages).toEqual([
      { role: "user", content: "I don't know yet." },
    ]);
    expect(host.textContent).toContain("Tutor turn 1");

    await enter("Your follow-up attempt", "Maybe the callback closes over the old binding.");
    button("Send follow-up").click();
    await flush();
    await flush();
    expect(postMessages).toHaveBeenCalledTimes(2);
    expect((postMessages.mock.calls[1][0] as any).messages).toEqual([
      { role: "user", content: "I don't know yet." },
      { role: "assistant", content: "Tutor turn 1" },
      { role: "user", content: "Maybe the callback closes over the old binding." },
    ]);
    expect(userState.value.tutorHistory).toHaveLength(1);
  });

  it("saves an independent reconstruction locally and reports confidence without writing mastery", async () => {
    render(
      <div>
        <div data-practice-layer="lesson" />
        <AiTutorModes lang="en" lessonKey="track/unit/lesson" concepts={["scope"]} />
      </div>,
      host,
    );
    const before = masteryState.get("scope")?.confidence;
    await submitAttempt();

    button("Reconstruct without help").click();
    await flush();
    expect(host.textContent).not.toContain("Tutor turn 1");
    await enter("Independent reconstruction", "The callback resolves scope through its lexical environment.");
    expect(writeResponse).toHaveBeenLastCalledWith(
      "track/unit/lesson",
      "ai-tutor::reconstruction",
      "The callback resolves scope through its lexical environment.",
    );

    button("I reconstructed it independently").click();
    await flush();
    expect(host.textContent).toContain("Use this lesson's authored practice or Review for a delayed check.");
    expect((host.querySelector('a[href="/en/review"]') as HTMLAnchorElement).textContent).toBe("Review");
    expect(masteryState.get("scope")?.confidence).toBe(before);
    expect((userState.value as any).conceptMastery).toBeUndefined();
  });
});
