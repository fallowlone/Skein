import { render } from "preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import IslandErrorBoundary from "./IslandErrorBoundary";

function Boom(): null {
  throw new Error("boom");
}

describe("IslandErrorBoundary", () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    render(null, host);
    host.remove();
    vi.restoreAllMocks();
  });

  test("renders children when nothing throws", () => {
    render(
      <IslandErrorBoundary lang="en">
        <span data-ok />
      </IslandErrorBoundary>,
      host,
    );
    expect(host.querySelector("[data-ok]")).toBeTruthy();
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  test("shows a bilingual fallback instead of unmounting the island", async () => {
    render(
      <IslandErrorBoundary lang="ru">
        <Boom />
      </IslandErrorBoundary>,
      host,
    );
    // Preact re-renders the boundary on a debounce tick, not synchronously.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("не загрузился");
  });
});
