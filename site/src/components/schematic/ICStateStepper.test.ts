import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Contract tests for the IC-state stepper. The stepper is a server-rendered
// .astro component (no hydration island): its three IC states must exist in
// the component source so the mechanism is readable with JS off, and each
// state must be announced with a machine label, not color alone.
//
// The .astro component is compiled by Astro at build time; here we assert
// the source contract — every string the render must emit is present in the
// component, EN and RU copy tables included. Vitest runs from site/, so the
// path resolves against the project root (jsdom makes import.meta.url
// non-file, so readFileSync needs a plain filesystem path).

const src = readFileSync(
  resolve(process.cwd(), "src/components/schematic/ICStateStepper.astro"),
  "utf8"
);

const has = (needle: string) => expect(src).toContain(needle);

describe("ICStateStepper static contract", () => {
  it("renders all three IC states server-side (no-JS readable)", () => {
    has("MONOMORPHIC");
    has("POLYMORPHIC");
    has("MEGAMORPHIC");
  });

  it("labels every state with an IC STATE machine label, not color alone", () => {
    has("IC STATE · MONOMORPHIC");
    has("IC STATE · POLYMORPHIC");
    has("IC STATE · MEGAMORPHIC");
  });

  it("declares no hydration island (progressive-enhancement script only)", () => {
    expect(src).not.toContain("client:visible");
    expect(src).not.toContain("client:load");
    expect(src).toMatch(/<script is:inline>/);
  });

  it("exposes semantic Step/Reset buttons with type=button", () => {
    expect(src).toMatch(/<button[^>]*type="button"[\s\S]*?STEP/i);
    expect(src).toMatch(/<button[^>]*type="button"[\s\S]*?RESET/i);
  });

  it("shows the observation sequence that drives each transition", () => {
    has("M_Point");
    has("M_Rect");
  });

  it("localises the three states into Russian", () => {
    has("МОНОМОРФНЫЙ");
    has("ПОЛИМОРФНЫЙ");
    has("МЕГАМОРФНЫЙ");
  });

  it("gates transitions behind prefers-reduced-motion", () => {
    has("prefers-reduced-motion");
  });

  it("announces state changes to assistive tech via aria-live", () => {
    has('aria-live="polite"');
  });
});
