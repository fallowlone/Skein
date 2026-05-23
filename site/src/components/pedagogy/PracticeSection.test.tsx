import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import PracticeSection from "./PracticeSection";
import type { PracticeTaskData } from "~/content.config";

const predict: PracticeTaskData = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "Predict the plan", ru: "Предскажи план" },
  prompt: { en: "Which join?", ru: "Какой join?" },
  scenario: { en: "Small table joined to big table", ru: "Маленькая таблица к большой" },
  reveal: { en: "Hash join", ru: "Hash join" },
} as PracticeTaskData;

describe("PracticeSection", () => {
  test("renders the practice-layer marker with the lessonKey", () => {
    const html = render(<PracticeSection lang="en" lessonKey="databases/03-execution-plans/03-join-algorithms" tasks={[predict]} />);
    expect(html).toContain("data-practice-layer");
    expect(html).toContain('data-lesson-key="databases/03-execution-plans/03-join-algorithms"');
  });
  test("renders each task title (EN)", () => {
    const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("Predict the plan");
  });
  test("renders RU titles when lang=ru", () => {
    const html = render(<PracticeSection lang="ru" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("Предскажи план");
  });
  test("shows a difficulty chip and estMin", () => {
    const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />);
    expect(html).toContain("recall");
    expect(html).toContain("3");
  });
});
