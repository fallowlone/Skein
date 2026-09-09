import { render as renderDom } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "preact-render-to-string";

const mocks = vi.hoisted(() => ({
  addCard: vi.fn(),
  allCards: vi.fn(() => []),
  recordPracticeOutcome: vi.fn(),
  recordPracticeResult: vi.fn(),
  runDebug: vi.fn(),
}));

vi.mock("~/scripts/review-state", () => ({ addCard: mocks.addCard, allCards: mocks.allCards }));
vi.mock("~/scripts/path/path-io", () => ({ recordPracticeOutcome: mocks.recordPracticeOutcome }));
vi.mock("~/scripts/metrics", () => ({ recordPracticeResult: mocks.recordPracticeResult }));
vi.mock("~/scripts/debug-runner", () => ({ runDebug: mocks.runDebug }));
import PracticeSection from "./PracticeSection";
import { difficultyRank, orderTasks, practiceAchievement, practiceEvidence } from "./PracticeSection";
import type { PracticeTaskData } from "~/content.config";
import { readProgress, readResponses, setTaskStatus } from "~/scripts/practice-state";
import type { Card } from "~/scripts/review-state";

const predict: PracticeTaskData = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3, version: 2,
  concepts: ["join-selection"], competency: "predict",
  title: { en: "Predict the plan", ru: "Предскажи план" },
  prompt: { en: "Which join?", ru: "Какой join?" },
  scenario: { en: "Small table joined to big table", ru: "Маленькая таблица к большой" },
  reveal: { en: "Hash join", ru: "Hash join" },
} as PracticeTaskData;

let host: HTMLDivElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const button = (text: string) => {
  const found = Array.from(host.querySelectorAll("button")).find((el) => el.textContent?.includes(text));
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
};

beforeEach(() => {
  localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.allCards.mockReturnValue([]);
});

afterEach(() => {
  renderDom(null, host);
  host.remove();
});

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

describe("practice evidence", () => {
  test("maps shared task metadata into an independently verified exec attempt", () => {
    expect(practiceEvidence(predict, "docs", "exec", 0, true)).toEqual({
      version: 2,
      concepts: ["join-selection"],
      competency: "predict",
      mode: "docs",
      hints: 0,
      evaluator: "exec",
      independent: true,
    });
  });

  test("keeps independent transfer distinct from ordinary production evidence", () => {
    const transferTask = {
      id: "transfer-1", type: "sandbox", difficulty: "stretch", estMin: 5,
      competency: "transfer", concepts: ["queueMicrotask"],
      title: { en: "Transfer", ru: "Перенос" }, prompt: { en: "Port it", ru: "Перенеси" },
      runtime: "js", initialCode: "", expected: { kind: "stdout-equals", value: "ok" },
    } as PracticeTaskData;

    expect(practiceEvidence(transferTask, "docs", "exec", 0, true)).toMatchObject({
      competency: "transfer",
      evaluator: "exec",
      independent: true,
      mode: "docs",
    });
  });

  test("derives assisted, independent, retained and transferred states without persisting new flags", () => {
    const base = { attempts: 1, passes: 1, lastResult: "pass" as const, lastAt: 10 };
    expect(practiceAchievement({ ...base, evaluator: "self", independent: false })).toEqual({
      completion: "self-reported", retained: null, transferred: false,
    });

    const transfer = { ...base, evaluator: "exec" as const, mode: "docs" as const, hints: 0, independent: true, competency: "transfer" as const };
    expect(practiceAchievement(transfer)).toEqual({
      completion: "independent", retained: null, transferred: true,
    });

    const delayedCard = {
      lastGrade: "good",
      lastEvidence: {
        eventId: "r1", basis: "self-report", attempt: "answered", support: "independent",
        timing: "delayed", attemptedAt: 11, revealedAt: 12, reviewedAt: 13, delayMs: 86_400_000,
      },
    } as Card;
    expect(practiceAchievement(transfer, delayedCard)).toEqual({
      completion: "independent", retained: "self-report", transferred: true,
    });

    expect(practiceAchievement({ ...transfer, lastResult: "fail" }, delayedCard)).toEqual({
      completion: "none", retained: null, transferred: false,
    });
  });

  test("seeds cards without leaking forEach's index into addCard's timestamp", async () => {
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />, host);
    await flush();
    expect(mocks.addCard).toHaveBeenCalled();
    expect(mocks.addCard.mock.calls[0]).toHaveLength(1);
  });

  test("reopening a completed task preserves done", async () => {
    setTaskStatus("a/b/c", "p1", "done");
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[predict]} />, host);
    button("Predict the plan").click();
    await flush();
    expect(readProgress("a/b/c").p1).toBe("done");
  });

  test("review reveal records attempted rather than done", async () => {
    const review = {
      id: "review-1", type: "review", difficulty: "apply", estMin: 5,
      title: { en: "Review this", ru: "Проверь" }, prompt: { en: "Find issues", ru: "Найди проблемы" },
      diff: { lang: "ts", code: "+ risky()" },
      findings: [{ id: "bug", severity: "bug", planted: true, label: { en: "Bug", ru: "Баг" }, explanation: { en: "Why", ru: "Почему" } }],
    } as PracticeTaskData;
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[review]} />, host);
    button("Review this").click();
    await flush();
    button("Reveal findings").click();
    await flush();
    expect(readProgress("a/b/c")["review-1"]).toBe("attempted");
    expect(mocks.recordPracticeOutcome).not.toHaveBeenCalled();
  });

  test("incident prose alone is not graded as a pass", async () => {
    const incident = {
      id: "incident-1", type: "incident", difficulty: "apply", estMin: 8,
      title: { en: "Handle incident", ru: "Инцидент" }, prompt: { en: "Respond", ru: "Ответь" },
      steps: [0, 1, 2].map((i) => ({ label: { en: `Step ${i}`, ru: `Шаг ${i}` }, prompt: { en: "What now?", ru: "Что дальше?" }, reveal: { en: "Model", ru: "Эталон" } })),
    } as PracticeTaskData;
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[incident]} />, host);
    button("Handle incident").click();
    await flush();
    for (const textarea of Array.from(host.querySelectorAll("textarea"))) {
      textarea.value = "A sufficiently long arbitrary response";
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await flush();
    }
    for (let i = 0; i < 3; i++) {
      button("Compare this step").click();
      await flush();
    }
    expect(readProgress("a/b/c")["incident-1"]).toBe("attempted");
    expect(mocks.recordPracticeOutcome).not.toHaveBeenCalled();
  });

  test("debug help survives remount and prevents an independent pass", async () => {
    const debug = {
      id: "debug-1", type: "debug", difficulty: "stretch", estMin: 8,
      title: { en: "Debug it", ru: "Отладь" }, prompt: { en: "Fix", ru: "Исправь" },
      starter: "return false", verify: "verify()", check: { kind: "no-error" },
      evidence: { en: "Failure", ru: "Сбой" }, hints: [{ en: "Inspect input", ru: "Проверь вход" }], reveal: { en: "Solution", ru: "Решение" },
      concepts: ["debugging"], competency: "debug", version: 3,
    } as PracticeTaskData;
    mocks.runDebug.mockResolvedValue({ status: "pass", stdout: "" });
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[debug]} />, host);
    button("Debug it").click();
    await flush();
    button("Hint").click();
    await flush();
    expect(readResponses("a/b/c")["debug-1::hints"]).toBe("1");

    renderDom(null, host);
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[debug]} />, host);
    button("Debug it").click();
    await flush();
    expect(host.textContent).toContain("Inspect input");
    button("Run").click();
    await flush();
    expect(mocks.recordPracticeOutcome).toHaveBeenCalledWith(
      "a/b/c",
      "debug-1",
      true,
      expect.objectContaining({ hints: 1, evaluator: "exec", independent: false }),
    );
  });

  test("debug reflection is editable, persisted, and deletable", async () => {
    const debug = {
      id: "debug-fields", type: "debug", difficulty: "stretch", estMin: 8,
      title: { en: "Debug fields", ru: "Поля" }, prompt: { en: "Fix", ru: "Исправь" }, starter: "x", verify: "x", check: { kind: "no-error" },
      evidence: { en: "Failure", ru: "Сбой" }, hints: [{ en: "Hint", ru: "Подсказка" }], reveal: { en: "Solution", ru: "Решение" },
    } as PracticeTaskData;
    renderDom(<PracticeSection lang="en" lessonKey="a/b/c" tasks={[debug]} />, host);
    button("Debug fields").click();
    await flush();
    const expected = host.querySelector('textarea[aria-label="Expected"]') as HTMLTextAreaElement;
    expected.value = "Expected output";
    expected.dispatchEvent(new Event("input", { bubbles: true }));
    await flush();
    expect(readResponses("a/b/c")["debug-fields::expected"]).toBe("Expected output");
    button("Delete debugging notes").click();
    await flush();
    expect(readResponses("a/b/c")["debug-fields::expected"]).toBeUndefined();
    expect((host.querySelector('textarea[aria-label="Expected"]') as HTMLTextAreaElement).value).toBe("");
  });
});
