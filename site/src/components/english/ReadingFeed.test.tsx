import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchCoachStatus: vi.fn(),
  markUnitRead: vi.fn(),
}));

vi.mock("~/english/state", () => ({
  englishState: { value: {} },
  getPlacement: () => ({ band: "A2" }),
  isUnitRead: () => false,
  markUnitRead: mocks.markUnitRead,
}));

vi.mock("~/lib/coach", () => ({ fetchCoachStatus: mocks.fetchCoachStatus }));
vi.mock("./EnReader", () => ({
  default: ({ unit }: { unit: { id: string } }) => <div data-reader={unit.id}>reader:{unit.id}</div>,
}));

import ReadingFeed from "./ReadingFeed";

let host: HTMLDivElement;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const freeStatus = { entitlements: { coach: false } };

function button(text: string, root: ParentNode = host): HTMLButtonElement {
  const found = Array.from(root.querySelectorAll("button")).find((el) => el.textContent?.includes(text));
  if (!found) throw new Error(`button not found: ${text}`);
  return found as HTMLButtonElement;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  mocks.fetchCoachStatus.mockReset();
  mocks.markUnitRead.mockReset();
  mocks.fetchCoachStatus.mockResolvedValue(freeStatus);
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe("ReadingFeed senior map teaser", () => {
  it("matches the free teaser contract and points to the real paid surface", async () => {
    render(<ReadingFeed lang="en" />, host);
    await flush();

    const aside = host.querySelector("aside") as HTMLElement;
    expect(aside.textContent).toContain("Your Senior Map");
    expect(aside.textContent).toContain("Pick any exercise. We’ll build a 7-day reading + practice plan.");
    expect(aside.textContent).toContain("Pro unlocks the full plan + progress tracking");
    expect(aside.textContent).toContain("Generate free 3-day plan");
    expect(aside.textContent).toContain("Bilingual mode:");
    expect(aside.textContent).toContain("side-by-side");
    expect(Array.from(aside.querySelectorAll("span")).filter((el) => /^DAY [1-7]$/.test(el.textContent ?? "")).map((el) => el.textContent)).toEqual([
      "DAY 1", "DAY 2", "DAY 3", "DAY 4", "DAY 5", "DAY 6", "DAY 7",
    ]);
    expect(Array.from(aside.querySelectorAll("span")).filter((el) => el.className.includes("blur-[2.5px]"))).toHaveLength(4);
    expect(aside.querySelector('a[href="/en/settings#coach-plan"]')?.textContent).toContain("Unlock Pro");
  });

  it("rotates the plan around the exercise the learner picked", async () => {
    render(<ReadingFeed lang="en" />, host);
    await flush();

    button("A deploy message in chat", host.querySelector("ul") as HTMLElement).click();
    await flush();
    expect(host.querySelector("[data-reader]")?.getAttribute("data-reader")).toBe("a2e-deploy-message");

    button("← All texts").click();
    await flush();
    const aside = host.querySelector("aside") as HTMLElement;
    expect(button("DAY 1", aside).textContent).toContain("A deploy message in chat");
  });

  it("opens day one from the free 3-day plan action", async () => {
    render(<ReadingFeed lang="en" />, host);
    await flush();

    button("Generate free 3-day plan").click();
    await flush();
    expect(host.querySelector("[data-reader]")?.getAttribute("data-reader")).toBe("code-review-101");
  });

  it("reveals days four through seven for an entitled learner", async () => {
    mocks.fetchCoachStatus.mockResolvedValue({ entitlements: { coach: true } });
    render(<ReadingFeed lang="en" />, host);
    await vi.waitFor(() => expect(host.querySelector('a[href="/en/settings#coach-plan"]')).toBeNull());

    const aside = host.querySelector("aside") as HTMLElement;
    expect(aside.textContent).toContain("A deploy message in chat");
    expect(aside.textContent).toContain("Basic Git Workflow");
    expect(aside.textContent).toContain("A Simple Bug Report");
    expect(aside.textContent).toContain("Asking a Teammate for Help");
    expect(Array.from(aside.querySelectorAll("span")).filter((el) => el.className.includes("blur-[2.5px]"))).toHaveLength(0);
    expect(aside.querySelector('a[href="/en/settings#coach-plan"]')).toBeNull();
  });
});
