import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Contract tests for the event-loop prediction stepper. Like the
// IC-state stepper, it is a server-rendered .astro component with
// zero hydration islands: the full program, its three lanes, and
// every predicted output row must exist in the source so the
// mechanism is readable with JS off, and predictions must be
// machine-labeled rather than color-coded.
//
// Vitest runs from site/ (jsdom makes import.meta.url non-file),
// so the path resolves against the project root.

const src = readFileSync(
  resolve(process.cwd(), "src/components/schematic/EventLoopPredict.astro"),
  "utf8"
);

const has = (needle: string) => expect(src).toContain(needle);

describe("EventLoopPredict static contract", () => {
  it("renders the three event-loop lanes server-side", () => {
    has("CALL STACK");
    has("MICROTASK QUEUE");
    has("TASK QUEUE");
  });

  it("shows the canonical example program", () => {
    has('console.log("start")');
    has('setTimeout');
    has('Promise.resolve()');
    has('console.log("end")');
  });

  it("predicts the correct observable output order", () => {
    const start = src.indexOf('"start"');
    const end = src.indexOf('"end"');
    const promise = src.indexOf('"promise"');
    const timeout = src.indexOf('"timeout"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(promise).toBeGreaterThan(end);
    expect(timeout).toBeGreaterThan(promise);
  });

  it("declares no hydration island (progressive-enhancement script only)", () => {
    expect(src).not.toContain("client:visible");
    expect(src).not.toContain("client:load");
    expect(src).toMatch(/<script is:inline>/);
  });

  it("exposes Predict and Reset buttons with type=button", () => {
    expect(src).toMatch(/<button[^>]*type="button"[\s\S]*?PREDICT/i);
    expect(src).toMatch(/<button[^>]*type="button"[\s\S]*?RESET/i);
  });

  it("carries a PREDICT → RUN interaction model", () => {
    has("data-elp-run");
    has("data-elp-predict");
  });

  it("localizes lanes and outputs into Russian", () => {
    has("СТЕК ВЫЗОВОВ");
    has("ОЧЕРЕДЬ МИКРОЗАДАЧ");
    has("ОЧЕРЕДЬ ЗАДАЧ");
  });

  it("gates transitions behind prefers-reduced-motion", () => {
    has("prefers-reduced-motion");
  });

  it("announces the predicted console to assistive tech", () => {
    has('aria-live="polite"');
  });
});
