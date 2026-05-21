import { describe, expect, test } from "vitest";
import { checkExerciseCounts } from "./exercise-counts";

// Fixtures mirror real Astro `dist` output: tier panels are closed with a
// `<!--/tier-panel-->` marker, and each island carries `component-url`
// pointing at the hashed `/_astro/<Name>.<hash>.js` bundle.
const island = (name: string) =>
  `<astro-island uid="x" component-url="/_astro/${name}.AbC123.js" component-export="default"></astro-island>`;

const wrap = (tier: "junior" | "middle" | "senior", tags: string[]) =>
  `<div data-tier-panel="${tier}">${tags.join("")}</div><!--/tier-panel-->`;

describe("exercise-counts", () => {
  test("junior with 5 components: no warning", () => {
    const tags = Array(5).fill(island("Quiz"));
    expect(checkExerciseCounts(wrap("junior", tags), "p.html")).toEqual([]);
  });
  test("junior with 3 components: warns shortfall", () => {
    const tags = Array(3).fill(island("Quiz"));
    const warns = checkExerciseCounts(wrap("junior", tags), "p.html");
    expect(warns).toHaveLength(1);
    expect(warns[0]).toMatch(/junior.*3.*target 5/);
  });
  test("middle with 8 components: no warning", () => {
    const tags = Array(8).fill(island("FadedExample"));
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")).toEqual([]);
  });
  test("middle with 5 components: warns shortfall", () => {
    const tags = Array(5).fill(island("Quiz"));
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")[0]).toMatch(/middle.*5.*target 8/);
  });
  test("senior with 7: no warning", () => {
    const tags = Array(7).fill(island("RetrievalDrawer"));
    expect(checkExerciseCounts(wrap("senior", tags), "p.html")).toEqual([]);
  });
  test("counts retrieval drawer questions as one component", () => {
    const tag = island("RetrievalDrawer");
    expect(checkExerciseCounts(wrap("senior", [tag]), "p.html")[0]).toMatch(/senior.*1.*target 7/);
  });
});
