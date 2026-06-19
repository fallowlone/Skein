import { render } from "preact";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import SpacedRevisitBanner from "./SpacedRevisitBanner";
import { addCard } from "~/scripts/review-state";

let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  localStorage.clear();
});
afterEach(() => {
  render(null, host);
  host.remove();
  localStorage.clear();
});

const seed = (lessonKey: string) =>
  addCard({ cardKey: `${lessonKey}::retrieval::0`, lessonKey, source: "retrieval", index: 0, front: "f", back: "b", lang: "en" });

describe("SpacedRevisitBanner", () => {
  it("renders nothing when no card is due", () => {
    render(<SpacedRevisitBanner lang="en" />, host);
    expect(host.querySelector("a")).toBeNull();
  });

  it("surfaces the lesson of a due card", () => {
    seed("networking/03-tcp/handshake"); // fresh card: interval 0 → dueAt === now → due
    render(<SpacedRevisitBanner lang="en" />, host);
    const link = host.querySelector("a") as HTMLAnchorElement | null;
    expect(link).not.toBeNull();
    expect(link!.getAttribute("href")).toContain("revisit=networking/03-tcp/handshake");
  });
});
