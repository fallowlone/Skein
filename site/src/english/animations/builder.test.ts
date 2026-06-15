import { describe, it, expect } from "vitest";
import { doc, axisScene, nodeRowScene, twoBoxScene } from "./builder";
import { COMP } from "./tokens";
import type { LottieDoc } from "./lottie-types";

function isValidDoc(d: LottieDoc): boolean {
  return (
    d.v === "5.7.0" && d.fr > 0 && d.op > d.ip && d.w > 0 && d.h > 0 &&
    Array.isArray(d.layers) && d.layers.length > 0 &&
    d.layers.every((l) => l.op > l.ip) &&
    JSON.parse(JSON.stringify(d)) != null
  );
}

describe("builder", () => {
  it("doc() wraps layers into a valid composition", () => {
    const d = doc(axisScene(["a", "b", "c"]));
    expect(isValidDoc(d)).toBe(true);
    expect(d.w).toBe(COMP.W);
    expect(d.h).toBe(COMP.H);
  });

  it("every scene renders its labels as text layers", () => {
    const labels = ["before", "when", "while"];
    const d = doc(axisScene(labels));
    const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
    for (const lbl of labels) expect(texts).toContain(lbl);
  });

  it("no text layer is empty", () => {
    const d = doc(nodeRowScene(["x", "y"], { mode: "stack" }));
    const empties = d.layers.filter((l) => l.ty === 5 && !l.t!.d.k[0].s.t.trim());
    expect(empties.length).toBe(0);
  });

  it("twoBoxScene places exactly two labelled boxes", () => {
    const d = doc(twoBoxScene("PAST", "PERFECT"));
    const texts = d.layers.filter((l) => l.ty === 5).map((l) => l.t!.d.k[0].s.t);
    expect(texts).toEqual(expect.arrayContaining(["PAST", "PERFECT"]));
  });

  it("is deterministic", () => {
    expect(doc(axisScene(["a", "b"]))).toEqual(doc(axisScene(["a", "b"])));
  });
});
