import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import PracticeSection from "./PracticeSection";
import { difficultyRank, orderTasks } from "./PracticeSection";
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
  test("renders the task-card marker for an sql sandbox task", () => {
    const sandbox = {
      id: "s1", type: "sandbox", difficulty: "apply", estMin: 5,
      title: { en: "Run EXPLAIN", ru: "Запусти EXPLAIN" },
      prompt: { en: "Try it", ru: "Попробуй" },
      runtime: "sql", setup: "CREATE TABLE t(x int);",
    } as unknown as PracticeTaskData;
    const html = render(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[sandbox]} />);
    expect(html).toContain('data-practice-task="s1"');
  });
});

describe("practice ordering", () => {
  test("difficultyRank orders recall<apply<stretch", () => {
    expect(difficultyRank("recall")).toBeLessThan(difficultyRank("apply"));
    expect(difficultyRank("apply")).toBeLessThan(difficultyRank("stretch"));
  });
  test("orderTasks sorts by difficulty, stable within a tier", () => {
    const t = (id: string, difficulty: string) => ({ id, difficulty }) as any;
    const out = orderTasks([t("a","stretch"), t("b","recall"), t("c","apply"), t("d","recall")]);
    expect(out.map((x) => x.id)).toEqual(["b","d","c","a"]);
  });
});
