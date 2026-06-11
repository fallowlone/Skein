import { describe, expect, it } from "vitest";
import { checkRetrievalDrawerSource } from "./retrieval-drawer";

const F = "lesson/index.mdx";

describe("checkRetrievalDrawerSource", () => {
  it("passes a drawer with an `id` slug (the MDX-authored shape)", () => {
    const src = `<RetrievalDrawer
  client:load
  id="demo-retrieval"
  lang="ru"
  questions={[{ q: "Q1", a: "A1" }]}
/>`;
    expect(checkRetrievalDrawerSource(src, F)).toEqual([]);
  });

  it("passes a drawer with a `pieceSlug` slug (the renamed contract)", () => {
    const src = `<RetrievalDrawer pieceSlug="demo" lang="en" questions={[{ q: "Q1", answer: "A1" }]} />`;
    expect(checkRetrievalDrawerSource(src, F)).toEqual([]);
  });

  it("flags a drawer with no slug prop", () => {
    const src = `<RetrievalDrawer client:load lang="ru" questions={[{ q: "Q1", a: "A1" }]} />`;
    const errs = checkRetrievalDrawerSource(src, F);
    expect(errs).toHaveLength(1);
    expect(errs[0]).toContain("missing a slug prop");
  });

  it("does not false-positive on `a:`/`q:` keys inside prose answers", () => {
    const src = `<RetrievalDrawer
  id="ok"
  lang="ru"
  questions={[{ q: "What is a: notation?", a: "It maps a: to a value; q: is unrelated." }]}
/>`;
    expect(checkRetrievalDrawerSource(src, F)).toEqual([]);
  });

  it("ignores files with no RetrievalDrawer", () => {
    expect(checkRetrievalDrawerSource("# just prose\nno widget here", F)).toEqual([]);
  });
});
