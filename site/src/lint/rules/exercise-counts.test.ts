import { describe, expect, test } from "vitest";
import { checkExerciseCounts } from "./exercise-counts";

const wrap = (tier: "junior" | "middle" | "senior", tags: string[]) => {
  return `<div data-tier-panel="${tier}">${tags.join("")}</div>`;
};

describe("exercise-counts", () => {
  test("junior with 5 components: no warning", () => {
    const tags = Array(5).fill('<astro-island component-export="Quiz"></astro-island>');
    expect(checkExerciseCounts(wrap("junior", tags), "p.html")).toEqual([]);
  });
  test("junior with 3 components: warns shortfall", () => {
    const tags = Array(3).fill('<astro-island component-export="Quiz"></astro-island>');
    const warns = checkExerciseCounts(wrap("junior", tags), "p.html");
    expect(warns).toHaveLength(1);
    expect(warns[0]).toMatch(/junior.*3.*target 5/);
  });
  test("middle with 8 components: no warning", () => {
    const tags = Array(8).fill('<astro-island component-export="FadedExample"></astro-island>');
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")).toEqual([]);
  });
  test("middle with 5 components: warns shortfall", () => {
    const tags = Array(5).fill('<astro-island component-export="Quiz"></astro-island>');
    expect(checkExerciseCounts(wrap("middle", tags), "p.html")[0]).toMatch(/middle.*5.*target 8/);
  });
  test("senior with 7: no warning", () => {
    const tags = Array(7).fill('<astro-island component-export="RetrievalDrawer"></astro-island>');
    expect(checkExerciseCounts(wrap("senior", tags), "p.html")).toEqual([]);
  });
  test("counts retrieval drawer questions as one component", () => {
    const tag = '<astro-island component-export="RetrievalDrawer"></astro-island>';
    expect(checkExerciseCounts(wrap("senior", [tag]), "p.html")[0]).toMatch(/senior.*1.*target 7/);
  });
});
