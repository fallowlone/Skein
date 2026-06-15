// Player-island contract test for GrammarAnimation.
//
// The repo mounts islands with preact's `render` into a host div (see
// pedagogy/RetrievalDrawer.test.tsx) rather than @testing-library/preact, which
// is not a dependency. `render(null, host)` runs the cleanup effects, which is
// the unmount equivalent and triggers `anim.destroy()`.
//
// lottie-web is mocked: GrammarAnimation imports it dynamically so it stays out
// of the base bundle; the mock lets us assert the loadAnimation options and the
// reduced-motion static-frame hold without a real renderer / SVG.
import { render } from "preact";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axisScene, doc } from "~/english/animations/builder";

const loadAnimation = vi.fn();
const destroy = vi.fn();
const goToAndStop = vi.fn();
vi.mock("lottie-web", () => ({
  default: {
    loadAnimation: (...a: unknown[]) => {
      loadAnimation(...a);
      return { destroy, goToAndStop, addEventListener: (_e: string, cb: () => void) => cb() };
    },
  },
}));

import { GrammarAnimation } from "./GrammarAnimation";

let host: HTMLDivElement;

beforeEach(() => {
  loadAnimation.mockClear();
  destroy.mockClear();
  goToAndStop.mockClear();
  host = document.createElement("div");
  document.body.appendChild(host);
});

describe("GrammarAnimation", () => {
  it("loads the animation with the provided doc", async () => {
    render(<GrammarAnimation doc={doc(axisScene(["a", "b"]))} />, host);
    await vi.waitFor(() => expect(loadAnimation).toHaveBeenCalledTimes(1));
    const opts = loadAnimation.mock.calls[0][0] as { animationData: unknown; renderer: string };
    expect(opts.renderer).toBe("svg");
    expect(opts.animationData).toBeDefined();
  });

  it("holds a static frame when reducedMotion is set", async () => {
    render(<GrammarAnimation doc={doc(axisScene(["a"]))} reducedMotion />, host);
    await vi.waitFor(() => expect(goToAndStop).toHaveBeenCalled());
    const opts = loadAnimation.mock.calls[0][0] as { autoplay: boolean; loop: boolean };
    expect(opts.autoplay).toBe(false);
    expect(opts.loop).toBe(false);
  });

  it("destroys the animation on unmount", async () => {
    render(<GrammarAnimation doc={doc(axisScene(["a"]))} />, host);
    await vi.waitFor(() => expect(loadAnimation).toHaveBeenCalled());
    render(null, host);
    expect(destroy).toHaveBeenCalledTimes(1);
  });
});
