import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import AlgorithmWorkspace, { type BankProblem } from "./AlgorithmWorkspace";
import { buildThreeSum, REFERENCE_SOLUTION } from "./problem-3sum";

const problem = buildThreeSum({
  id: "3sum",
  leetcodeId: 15,
  slug: "3sum",
  title: "3Sum",
  difficulty: "medium",
  pattern: "two-pointers",
  targetMinutes: 20,
  companies: ["Amazon", "Meta"],
  hints: [
    { en: "Sort first.", ru: "Сначала отсортируй." },
    { en: "Fix one index.", ru: "Зафиксируй один индекс." },
    { en: "Use two pointers.", ru: "Используй два указателя." },
    { en: "Skip duplicates after a hit.", ru: "После совпадения пропускай дубликаты." },
  ],
  followUp: { en: "Can you generalize to 4Sum?", ru: "Можешь обобщить до 4Sum?" },
});

const bankProblems: BankProblem[] = [
  {
    id: "valid-palindrome", leetcodeId: 125, title: "Valid Palindrome", pattern: "two-pointers",
    difficulty: "easy", targetMinutes: 10, companies: ["Meta"], unit: "02-arrays-strings",
  },
  {
    id: "3sum", leetcodeId: 15, title: "3Sum", pattern: "two-pointers",
    difficulty: "medium", targetMinutes: 20, companies: ["Amazon", "Meta"], unit: "02-arrays-strings",
  },
  {
    id: "binary-search", leetcodeId: 704, title: "Binary Search", pattern: "binary-search",
    difficulty: "easy", targetMinutes: 10, companies: ["Google"], unit: "03-sorting-search",
  },
];

let host: HTMLDivElement;

beforeEach(() => {
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.appendChild(host);
});

afterEach(() => {
  vi.useRealTimers();
  render(null, host);
  host.remove();
  delete document.body.dataset.expeditionPass;
});

const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

function mount() {
  render(
    <AlgorithmWorkspace
      lang="en"
      problem={problem}
      bankProblems={bankProblems}
      trackHref="/en/learn/algorithms"
      telegramStarsUrl={null}
    />,
    host,
  );
}

function button(text: string): HTMLButtonElement {
  const found = Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes(text));
  if (!found) throw new Error(`Button not found: ${text}`);
  return found;
}

function closePass() {
  (host.querySelector('[aria-label="Close Expedition Pass"]') as HTMLButtonElement)?.click();
}

describe("AlgorithmWorkspace interactions", () => {
  test("mode, complexity seal, timer and Reset Session change real session state", async () => {
    vi.useFakeTimers();
    mount();
    await settle();
    closePass();

    const untimed = button("No timer");
    untimed.click();
    await settle();
    expect(untimed.getAttribute("aria-pressed")).toBe("true");

    const timed = button("Against the clock");
    timed.click();
    await settle();
    expect(timed.getAttribute("aria-pressed")).toBe("true");

    const complexity = button("O(n²)");
    complexity.click();
    await settle();
    expect(complexity.getAttribute("aria-pressed")).toBe("true");
    button("Seal prediction & open editor").click();
    await settle();
    expect(host.textContent).toContain("sealed prediction");

    vi.advanceTimersByTime(3_000);
    await settle();
    expect(host.textContent).toMatch(/elapsed00:0[1-3]/);

    const beforePause = host.textContent?.match(/elapsed(\d\d:\d\d)/)?.[1];
    button("Metrics").click();
    await settle();
    vi.advanceTimersByTime(5_000);
    await settle();
    button("Workspace").click();
    await settle();
    const afterPause = host.textContent?.match(/elapsed(\d\d:\d\d)/)?.[1];
    const toSeconds = (clock?: string) => clock ? Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3)) : NaN;
    expect(toSeconds(afterPause) - toSeconds(beforePause)).toBeLessThanOrEqual(1);

    button("Reset session").click();
    await settle();
    expect(host.textContent).toContain("What time complexity will your solution have?");
    expect(host.textContent).not.toContain("sealed prediction");
    const saved = JSON.parse(window.localStorage.getItem("skein.algo-workspace.3sum.v1") ?? "{}") as { code?: string; attempts?: unknown[] };
    expect(saved.code).toBe(problem.seedCode);
    expect(saved.attempts).toEqual([]);
  });

  test("hint ladder charges mastery once and unlocks the next rung", async () => {
    mount();
    await settle();
    closePass();

    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();
    button("Reveal rung 1").click();
    await settle();

    expect(host.textContent).toContain("Sort first.");
    expect(host.textContent).toContain("1 / 4 spent");
    expect(host.textContent).toContain("94");
    expect(button("Reveal rung 2").disabled).toBe(false);
    expect(JSON.parse(window.localStorage.getItem("skein.algo-workspace.3sum.v1") ?? "{}")).toMatchObject({
      committed: "O(n²)",
      hintsOpen: 1,
    });
  });

  test("reload preserves active hint scoring and solved progress records the algorithm unit", async () => {
    window.localStorage.setItem("skein.algo-workspace.3sum.v1", JSON.stringify({
      code: problem.seedCode,
      mode: "timed",
      scheme: "ink",
      attempts: [],
      choice: "O(n²)",
      committed: "O(n²)",
      elapsedSeconds: 37,
      sealedAtSeconds: 4,
      hintsOpen: 1,
    }));
    mount();
    closePass();
    await vi.waitFor(() => expect(host.textContent).toContain("Sort first."), { timeout: 1_000 });
    expect(host.textContent).toContain("94");
    expect(host.textContent).toContain("00:37");

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = REFERENCE_SOLUTION;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Submit").click();
    await vi.waitFor(() => expect(host.textContent).toContain("3Sum · submitted"), { timeout: 5_000 });

    const drill = JSON.parse(window.localStorage.getItem("skein.drill.v1") ?? "{}");
    expect(drill["3sum"]).toMatchObject({ status: "solved", noHint: false, unit: "02-arrays-strings" });
  });

  test("hint reveal stays locked while Submit is running", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = REFERENCE_SOLUTION;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();

    button("Submit").click();
    await settle();
    const reveal = button("Reveal rung 1");
    expect(reveal.disabled).toBe(true);
    reveal.click();
    await settle();
    expect(host.textContent).not.toContain("Sort first.");

    await vi.waitFor(() => expect(host.textContent).toContain("3Sum · submitted"), { timeout: 5_000 });
    const history = JSON.parse(window.localStorage.getItem("skein.algo-workspace.3sum.history.v1") ?? "[]");
    expect(history[0]?.hintsOpen).toBe(0);
    expect(history[0]?.mastery).toBe(100);
    const drill = JSON.parse(window.localStorage.getItem("skein.drill.v1") ?? "{}");
    expect(drill["3sum"]).toMatchObject({ status: "solved", noHint: true });
  });

  test("Submit completion does not override navigation chosen while tests are running", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = REFERENCE_SOLUTION;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Submit").click();
    await settle();
    button("Metrics").click();
    await settle();

    await vi.waitFor(() => {
      const drill = JSON.parse(window.localStorage.getItem("skein.drill.v1") ?? "{}");
      expect(drill["3sum"]?.status).toBe("solved");
    }, { timeout: 5_000 });
    expect(host.textContent).toContain("measured in this browser");
    expect(host.textContent).not.toContain("3Sum · submitted");
  });

  test("Attempts stores and restores real code snapshots", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "function threeSum() { return []; }";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Save attempt").click();
    await settle();

    expect(host.textContent).toContain("#01");
    expect(host.textContent).toContain("function threeSum() { return []; }");
    expect(window.localStorage.getItem("skein.algo-workspace.3sum.v1")).toContain("function threeSum() { return []; }");
  });

  test("Reset clears session attempts while persistent Metrics history survives", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();
    button("Save attempt").click();
    await settle();

    expect(JSON.parse(window.localStorage.getItem("skein.algo-workspace.3sum.history.v1") ?? "[]")).toHaveLength(1);
    button("Reset session").click();
    await settle();
    expect(JSON.parse(window.localStorage.getItem("skein.algo-workspace.3sum.v1") ?? "{}").attempts).toEqual([]);

    button("Metrics").click();
    await settle();
    expect(host.textContent).toContain("1 saved attempts");
  });

  test("rail tabs support Arrow keys with roving focus", async () => {
    mount();
    await settle();
    closePass();

    const hints = host.querySelector("#solve-rail-tab-hints") as HTMLButtonElement;
    const attempts = host.querySelector("#solve-rail-tab-attempts") as HTMLButtonElement;
    hints.focus();
    hints.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await settle();

    expect(attempts.getAttribute("aria-selected")).toBe("true");
    expect(attempts.tabIndex).toBe(0);
    expect(document.activeElement).toBe(attempts);
  });

  test("editing while a run is in flight discards stale results", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = REFERENCE_SOLUTION;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Run tests").click();
    textarea.value = "function threeSum() { return null; }";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();

    await vi.waitFor(() => expect(button("Run tests").disabled).toBe(false), { timeout: 5_000 });
    expect(host.textContent).toContain("Code changed while tests were running. Run again.");
    expect(host.textContent).not.toContain("3 of 3 pass");
  });

  test("restoring an attempt during Submit invalidates the tested snapshot", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();

    const textarea = host.querySelector("textarea") as HTMLTextAreaElement;
    textarea.value = "function threeSum() { return null; }";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Save attempt").click();
    await settle();

    textarea.value = REFERENCE_SOLUTION;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    await settle();
    button("Submit").click();
    button("Restore").click();

    await settle();
    expect(host.textContent).toContain("Submitting…");
    await vi.waitFor(() => expect(host.textContent).not.toContain("Submitting…"), { timeout: 5_000 });
    expect(host.textContent).toContain("Code changed while tests were running. Run again.");
    expect(host.textContent).not.toContain("3Sum · submitted");
    expect((host.querySelector("textarea") as HTMLTextAreaElement).value).toContain("return null");
  });

  test("submit history keeps aggregate results but never persists submit-only case details", async () => {
    mount();
    await settle();
    closePass();
    button("O(n²)").click();
    await settle();
    button("Seal prediction & open editor").click();
    await settle();
    button("Submit").click();

    await vi.waitFor(() => expect(host.textContent).toContain("3Sum · submitted"), { timeout: 5_000 });
    await vi.waitFor(() => expect(document.activeElement?.id).toBe("algorithm-debrief-heading"), { timeout: 1_000 });
    expect(host.textContent).toContain("Submitted ·");
    const history = window.localStorage.getItem("skein.algo-workspace.3sum.history.v1") ?? "";
    expect(history).toContain('"total":8');
    expect(history).not.toContain("[[0,0,0]]");
    expect(history).not.toContain("[[-2,-2,-2,0,0,2,2,2]]");
  });

  test("main navigation has real screens and Problem Bank can return to the workspace problem", async () => {
    mount();
    await settle();
    closePass();

    button("Debrief").click();
    await settle();
    expect(host.textContent).toContain("Finish and submit an attempt first.");
    button("Return to Workspace").click();
    await settle();
    expect(document.activeElement?.id).toBe("algorithm-nav-workspace");

    button("Metrics").click();
    await settle();
    expect(host.textContent).toContain("measured in this browser");

    button("Problem bank").click();
    await settle();
    expect(host.textContent).toContain("Problems");
    expect(host.textContent).toContain("Binary Search");

    const currentProblem = Array.from(host.querySelectorAll("button")).find((node) => node.textContent?.includes("3Sum") && node.textContent?.includes("two-pointers"));
    expect(currentProblem).toBeTruthy();
    (currentProblem as HTMLButtonElement).click();
    await settle();
    expect(host.textContent).toContain("What time complexity will your solution have?");
    expect(document.activeElement?.id).toBe("algorithm-nav-workspace");
  });

  test("Expedition route opens the corresponding real Problem Bank filter", async () => {
    mount();
    await settle();
    button("BinarySearch").click();
    await settle();

    expect(host.textContent).toContain("Problems");
    expect(host.textContent).toContain("Binary Search");
    expect(host.textContent).not.toContain("Valid Palindrome");
    expect(document.activeElement?.id).toBe("algorithm-nav-bank");
  });
});
