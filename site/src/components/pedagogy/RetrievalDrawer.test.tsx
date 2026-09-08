// Contract regression test for RetrievalDrawer.
//
// Lesson MDX passes the *content* prop shape — top-level `id` and questions
// `{ q, a }` (no per-question `id`, key `a` not `answer`). The SRS refactor
// (050caa7b) renamed the component contract to `pieceSlug` / `{ id, q, answer }`
// without migrating ~2550 MDX call sites, so every drawer silently broke:
//   1. answer body was `q.answer` === undefined → nothing revealed
//   2. reveal key was `q.id` === undefined → one Reveal opened all questions
//   3. confidence key was `q.id` === undefined → one rating lit every question
// These tests pin the tolerant-reader behaviour that fixes all three.
import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RetrievalDrawer from "./RetrievalDrawer";
import { readResponses } from "~/scripts/practice-state";

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
  vi.restoreAllMocks();
});

// Preact batches state updates; flush the scheduled rerender.
const flush = () => new Promise((r) => setTimeout(r, 0));

const lis = () => Array.from(host.querySelectorAll("ol > li")) as HTMLElement[];
const revealBtn = (li: HTMLElement) =>
  Array.from(li.querySelectorAll("button")).find((b) =>
    /reveal/i.test(b.textContent ?? ""),
  ) as HTMLButtonElement | undefined;
const confBtns = (li: HTMLElement) =>
  Array.from(
    li.querySelectorAll('button[aria-label^="grade"]'),
  ) as HTMLButtonElement[];
const answer = async (li: HTMLElement, text = "A real attempt before reveal") => {
  const textarea = li.querySelector("textarea")!;
  textarea.value = text;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  await flush();
};

// Mirrors the real broken MDX shape: top `id`, questions `{ q, a }`.
const renderDrawer = () =>
  render(
    <RetrievalDrawer
      id="demo-retrieval"
      lang="en"
      questions={[
        { q: "Q_ONE", a: "ANSWER_ONE" },
        { q: "Q_TWO", a: "ANSWER_TWO" },
      ]}
    />,
    host,
  );

describe("RetrievalDrawer tolerant reader", () => {
  it("reveals the answer body from the `a` key", async () => {
    renderDrawer();
    expect(host.textContent).not.toContain("ANSWER_ONE");

    await answer(lis()[0]);
    revealBtn(lis()[0])!.click();
    await flush();

    expect(lis()[0].textContent).toContain("ANSWER_ONE");
  });

  it("reveals each question independently (no shared undefined key)", async () => {
    renderDrawer();
    await answer(lis()[0]);
    revealBtn(lis()[0])!.click();
    await flush();

    // Q1 open, Q2 still closed.
    expect(lis()[0].textContent).toContain("ANSWER_ONE");
    expect(host.textContent).not.toContain("ANSWER_TWO");
    expect(revealBtn(lis()[1])).toBeTruthy();
    expect(confBtns(lis()[0]).length).toBe(4);
    expect(confBtns(lis()[1]).length).toBe(0);
  });

  it("rates confidence per question, not across all", async () => {
    renderDrawer();
    await answer(lis()[0]);
    revealBtn(lis()[0])!.click();
    await flush();
    await answer(lis()[1]);
    revealBtn(lis()[1])!.click();
    await flush();

    // Rate Q1 = "good" (index 2); Q2 must stay unrated.
    confBtns(lis()[0])[2].click();
    await flush();

    const pressed = (li: HTMLElement) =>
      confBtns(li).filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed(lis()[0]).map((b) => b.textContent)).toEqual(["good"]);
    expect(pressed(lis()[1]).length).toBe(0);
  });
});

import { allCards } from "~/scripts/review-state";

const gradeBtns = (li: HTMLElement) =>
  Array.from(
    li.querySelectorAll('button[aria-label^="grade"]'),
  ) as HTMLButtonElement[];

describe("grade persistence", () => {
  it("clicking a grade after reveal advances the seeded SM-2 card", async () => {
    render(
      <RetrievalDrawer
        id="networking/03-tcp-handshake"
        lang="en"
        questions={[{ q: "What is the handshake?", a: "SYN, SYN-ACK, ACK" }]}
      />,
      host,
    );
    await flush(); // lets the seed useEffect run (cardsFromRetrieval → addCard)

    const li = lis()[0];
    await answer(li);
    revealBtn(li)!.click();
    await flush();

    const good = gradeBtns(lis()[0]).find((b) => /good/i.test(b.getAttribute("aria-label") ?? ""))!;
    good.click();
    await flush();

    const card = allCards().find(
      (c) => c.cardKey === "networking/03-tcp-handshake::retrieval::0",
    );
    expect(card).toBeDefined();
    expect(card!.sched.reps).toBe(1); // a non-"again" grade advances reps 0 → 1
    expect(card!.lastReviewedAt).not.toBeNull();
  });

  it("requires a persisted attempt or an explicit skip before revealing", async () => {
    renderDrawer();
    const li = lis()[0];
    const reveal = revealBtn(li)!;
    expect(reveal.disabled).toBe(true);

    const textarea = li.querySelector("textarea")!;
    textarea.value = "My independent attempt";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();

    expect(readResponses("demo-retrieval")["retrieval::0"]).toBe("My independent attempt");
    expect(revealBtn(lis()[0])!.disabled).toBe(false);
    revealBtn(lis()[0])!.click();
    await flush();
    expect(lis()[0].textContent).toContain("ANSWER_ONE");
  });

  it("records an explicit skip as self-reported, non-independent evidence", async () => {
    const now = Date.parse("2026-09-08T12:00:00Z");
    vi.spyOn(Date, "now").mockReturnValue(now);
    renderDrawer();
    const skip = Array.from(lis()[0].querySelectorAll("button")).find((b) => /^skip$/i.test(b.textContent?.trim() ?? ""))!;
    skip.click();
    await flush();

    const card = allCards().find((c) => c.cardKey === "demo-retrieval::retrieval::0")!;
    expect(card.lastGrade).toBe("again");
    expect(card.lastEvidence).toMatchObject({
      basis: "self-report",
      attempt: "skipped",
      support: "none",
      timing: "same-pass",
      attemptedAt: null,
      reviewedAt: now,
    });
  });

  it("accepts only the first grade for one reveal event", async () => {
    renderDrawer();
    const textarea = lis()[0].querySelector("textarea")!;
    textarea.value = "A real attempt before reveal";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    revealBtn(lis()[0])!.click();
    await flush();

    gradeBtns(lis()[0])[2].click();
    await flush();
    expect(gradeBtns(lis()[0]).every((b) => b.disabled)).toBe(true);
    expect(allCards()[0].sched.reps).toBe(1);
  });
});

describe("lessonKey injection", () => {
  it("seeds cards with the injected canonical lessonKey and canonical cardKey", async () => {
    render(
      <RetrievalDrawer
        id="07-stability-retrieval"
        lessonKey="databases/03-execution-plans/07-plan-stability"
        lang="en"
        questions={[{ q: "front", a: "back" }]}
      />,
      host,
    );
    // Preact schedules useEffect via requestAnimationFrame → setTimeout chain.
    // In jsdom that requires draining the rAF queue then one more setTimeout.
    // Triggering a DOM interaction (clicking reveal) forces Preact to flush
    // pending effects synchronously as part of its re-render cycle — the same
    // pattern used by the grade-persistence test above.
    const li = host.querySelector("ol > li") as HTMLElement;
    const reveal = Array.from(li.querySelectorAll("button")).find((b) =>
      /reveal/i.test(b.textContent ?? ""),
    ) as HTMLButtonElement;
    reveal.click();
    await flush();

    const card = allCards().find((c) => c.cardKey === "databases/03-execution-plans/07-plan-stability::retrieval::0");
    expect(card).toBeDefined();
    expect(card!.lessonKey).toBe("databases/03-execution-plans/07-plan-stability");
  });
});
