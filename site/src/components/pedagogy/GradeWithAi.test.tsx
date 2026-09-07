import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  keyStatus: vi.fn(),
  gradePractice: vi.fn(),
  fetchCoachStatus: vi.fn(),
  gradePracticeManaged: vi.fn(),
}));

vi.mock("~/english/byok", () => ({ keyStatus: mocks.keyStatus }));
vi.mock("~/english/state", () => ({ getGradingModel: () => "test-model" }));
vi.mock("~/scripts/practice-grade-llm", () => ({
  MAX_INPUT_CHARS: 4000,
  gradePractice: mocks.gradePractice,
}));
vi.mock("~/lib/coach", () => ({
  fetchCoachStatus: mocks.fetchCoachStatus,
  gradePracticeManaged: mocks.gradePracticeManaged,
}));

import GradeWithAi from "./GradeWithAi";

let host: HTMLDivElement;
const task = { type: "design", id: "coach-test" } as any;
const critique = {
  verdict: "partial" as const,
  rubricChecks: [{ item: "bounds bursts", met: false, note: "boundary burst" }],
  seniorAdditions: ["consider clock skew"],
  missed: { kind: "tradeoff" as const, what: "accuracy vs state" },
  summary: "Use a token bucket for bounded bursts.",
};
const baseStatus = {
  authenticated: true,
  entitlements: { coach: false },
  billing: { configured: false, sponsorUrl: null, provider: null },
  managedAi: {
    available: true,
    limit: 30,
    used: 0,
    remaining: 30,
    period: "2026-09",
    resetsAt: "2026-10-01T00:00:00.000Z",
  },
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

async function submit(answer = "Use a fixed window") {
  (Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Grade with AI")) as HTMLButtonElement).click();
  await flush();
  const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
  textarea.value = answer;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
  (Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Grade my answer")) as HTMLButtonElement).click();
  await flush();
  await flush();
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  mocks.keyStatus.mockReset();
  mocks.gradePractice.mockReset();
  mocks.fetchCoachStatus.mockReset();
  mocks.gradePracticeManaged.mockReset();
  mocks.keyStatus.mockResolvedValue("none");
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe("GradeWithAi Coach boundary", () => {
  it("discloses the Anthropic data boundary before any AI request", async () => {
    mocks.keyStatus.mockResolvedValue("unlocked");
    render(<GradeWithAi lang="en" task={task} />, host);
    (Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Grade with AI")) as HTMLButtonElement).click();
    await flush();

    expect(host.textContent).toContain("this answer plus the current task and rubric/model-answer context go to Anthropic");
    expect(host.textContent).toContain("broader progress history is not sent");
    expect(mocks.fetchCoachStatus).not.toHaveBeenCalled();
    expect(mocks.gradePracticeManaged).not.toHaveBeenCalled();
    expect(mocks.gradePractice).not.toHaveBeenCalled();
  });

  it("shows the Free/Coach choice before the learner writes an answer", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({
      ...baseStatus,
      billing: { configured: true, sponsorUrl: "https://github.com/sponsors/skein-owner", provider: "github-sponsors" },
    });
    render(<GradeWithAi lang="en" task={task} />, host);
    (Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.includes("Grade with AI")) as HTMLButtonElement).click();
    await flush();
    await flush();

    expect(host.textContent).toContain("use your own Anthropic key for free, or Coach for managed AI");
    expect(host.textContent).toContain("Coach adds 30 managed senior reviews per month");
    expect(host.querySelector('a[href="https://github.com/sponsors/skein-owner"]')).not.toBeNull();
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toBe("");
    expect(mocks.gradePracticeManaged).not.toHaveBeenCalled();
  });

  it("keeps BYOK grading free and never checks Coach when a key is available", async () => {
    mocks.keyStatus.mockResolvedValue("unlocked");
    mocks.gradePractice.mockResolvedValue(critique);
    render(<GradeWithAi lang="en" task={task} />, host);

    await submit();

    expect(host.textContent).toContain(critique.summary);
    expect(mocks.gradePractice).toHaveBeenCalledOnce();
    expect(mocks.fetchCoachStatus).not.toHaveBeenCalled();
  });

  it("does not upsell Coach when a saved BYOK key is locked", async () => {
    mocks.keyStatus.mockResolvedValue("locked");
    render(<GradeWithAi lang="en" task={task} />, host);

    await submit();

    expect(host.textContent).toContain("saved Anthropic key is locked");
    expect(host.querySelector('a[href="/en/account"]')).not.toBeNull();
    expect(mocks.fetchCoachStatus).not.toHaveBeenCalled();
    expect(mocks.gradePracticeManaged).not.toHaveBeenCalled();
  });

  it("shows an honest unavailable state when billing is not configured", async () => {
    mocks.fetchCoachStatus.mockResolvedValue(baseStatus);
    render(<GradeWithAi lang="en" task={task} />, host);

    await submit();

    expect(host.textContent).toContain("Coach checkout is not configured yet");
    expect(host.querySelector('a[href*="github.com/sponsors/"]')).toBeNull();
    expect(mocks.gradePracticeManaged).not.toHaveBeenCalled();
  });

  it("does not ask a signed-out learner to sign in while managed Coach is unavailable", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({
      ...baseStatus,
      authenticated: false,
      billing: { configured: true, sponsorUrl: "https://github.com/sponsors/skein-owner", provider: "github-sponsors" },
      managedAi: { ...baseStatus.managedAi, available: false },
    });
    render(<GradeWithAi lang="en" task={task} />, host);

    await submit();

    expect(host.textContent).toContain("Coach signup is paused while managed AI is unavailable");
    expect(host.textContent).not.toContain("Sign in with GitHub to use Coach");
    expect(host.querySelector('a[href="/en/account"]')).toBeNull();
  });

  it("uses managed AI for an entitled learner", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({
      ...baseStatus,
      entitlements: { coach: true },
      managedAi: { ...baseStatus.managedAi, used: 4, remaining: 26 },
    });
    mocks.gradePracticeManaged.mockResolvedValue({
      critique,
      usage: { used: 5, limit: 30, remaining: 25, period: "2026-09" },
    });
    render(<GradeWithAi lang="en" task={task} />, host);

    await submit();

    expect(mocks.gradePracticeManaged).toHaveBeenCalledOnce();
    expect(host.textContent).toContain(critique.summary);
  });

  it("shows quota exhaustion and provider failure without breaking the practice UI", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({
      ...baseStatus,
      entitlements: { coach: true },
      managedAi: { ...baseStatus.managedAi, used: 30, remaining: 0 },
    });
    render(<GradeWithAi lang="en" task={task} />, host);
    await submit();
    expect(host.textContent).toContain("Coach AI limit reached for this month");
    expect(mocks.gradePracticeManaged).not.toHaveBeenCalled();

    render(null, host);
    mocks.fetchCoachStatus.mockResolvedValue({
      ...baseStatus,
      entitlements: { coach: true },
    });
    mocks.gradePracticeManaged.mockRejectedValue(new Error("ai_grading_failed"));
    render(<GradeWithAi lang="en" task={task} />, host);
    await submit();
    expect(host.textContent).toContain("AI grading is temporarily unavailable");
    expect(host.textContent).toContain("Grade my answer");
  });
});
