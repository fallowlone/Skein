import { describe, it, expect } from "vitest";
import { VIEW } from "./scene-types";
import type { Scene } from "./scene-types";

describe("scene model", () => {
  it("viewBox is 800x450", () => {
    expect([VIEW.W, VIEW.H]).toEqual([800, 450]);
  });
  it("Scene accepts a primitive list", () => {
    const s: Scene = { prims: [{ k: "genre", text: "PRESENT PERFECT", x: 40, y: 40 }] };
    expect(s.prims).toHaveLength(1);
  });
});
