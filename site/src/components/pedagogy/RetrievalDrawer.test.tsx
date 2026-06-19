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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RetrievalDrawer from "./RetrievalDrawer";

let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
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

    revealBtn(lis()[0])!.click();
    await flush();

    expect(lis()[0].textContent).toContain("ANSWER_ONE");
  });

  it("reveals each question independently (no shared undefined key)", async () => {
    renderDrawer();
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
    revealBtn(lis()[0])!.click();
    await flush();
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
});
