import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ReviewSession from "./ReviewSession";
import { addCard, allCards, recordReview, REVIEW_KEY, type CardSeed, type ReviewEvidence } from "~/scripts/review-state";
import { readResponses } from "~/scripts/practice-state";

const NOW = Date.parse("2026-09-08T12:00:00Z");
const DAY = 86_400_000;
let host: HTMLDivElement;

const seed: CardSeed = {
  cardKey: "networking/03-tcp/01-handshake::retrieval::0",
  lessonKey: "networking/03-tcp/01-handshake",
  source: "retrieval",
  index: 0,
  front: "What does the handshake establish?",
  back: "Sequence-number state in both directions.",
  lang: "en",
  answerMode: "inline",
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const button = (name: RegExp) => Array.from(host.querySelectorAll("button")).find((b) => name.test(b.textContent ?? "")) as HTMLButtonElement | undefined;

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  vi.spyOn(Date, "now").mockReturnValue(NOW);
});

afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("ReviewSession evidence", () => {
  it("requires an answer or explicit skip and persists the draft through practice-state", async () => {
    addCard(seed, NOW);
    render(<ReviewSession lang="en" />, host);
    await flush();

    expect(button(/show answer/i)?.disabled).toBe(true);
    const textarea = host.querySelector("textarea")!;
    textarea.value = "It establishes synchronized sequence state.";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    expect(readResponses(seed.lessonKey)[`review::${seed.cardKey}`]).toBe(textarea.value);
    expect(button(/show answer/i)?.disabled).toBe(false);
  });

  it("records a first in-session review as immediate self-report evidence", async () => {
    addCard(seed, NOW);
    render(<ReviewSession lang="en" />, host);
    await flush();
    const textarea = host.querySelector("textarea")!;
    textarea.value = "Independent answer";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    button(/show answer/i)!.click();
    await flush();
    button(/^good$/i)!.click();
    await flush();

    expect(allCards()[0].lastEvidence).toMatchObject({
      basis: "self-report",
      attempt: "answered",
      support: "independent",
      timing: "immediate",
      attemptedAt: NOW,
      reviewedAt: NOW,
      delayMs: 0,
    });
  });

  it("records a due review after a scheduled interval as delayed", async () => {
    const firstAt = NOW - 2 * DAY;
    const first: ReviewEvidence = {
      eventId: "first",
      basis: "self-report",
      attempt: "answered",
      support: "independent",
      timing: "same-pass",
      attemptedAt: firstAt,
      revealedAt: firstAt,
      reviewedAt: firstAt,
      delayMs: 0,
    };
    addCard(seed, firstAt);
    recordReview(seed.cardKey, "good", first);
    render(<ReviewSession lang="en" />, host);
    await flush();
    const textarea = host.querySelector("textarea")!;
    textarea.value = "Delayed answer";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    button(/show answer/i)!.click();
    await flush();
    button(/^again$/i)!.click();
    await flush();

    expect(allCards()[0].lastEvidence).toMatchObject({ timing: "delayed", delayMs: 2 * DAY, reviewedAt: NOW });
  });

  it("routes non-inline practice cards to the original task without inventing an answer", async () => {
    addCard({ ...seed, source: "practice", taskId: "run-it", answerMode: "original-task", back: "", front: "Run the original task" }, NOW);
    render(<ReviewSession lang="en" />, host);
    await flush();

    expect(host.textContent).not.toContain("answer\nRun the original task");
    const link = host.querySelector("a")!;
    expect(link.textContent).toMatch(/original task/i);
    expect(link.getAttribute("href")).toBe("/en/learn/networking/03-tcp/01-handshake/");
  });
});
