import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import JsSandbox from "./JsSandbox";

describe("JsSandbox (shell)", () => {
  // The shell previews the starter and launches the docked editor; the editor itself
  // (CodeMirror) is lazy and never part of the server-rendered shell.
  test("previews the starter code and offers the editor launcher", () => {
    const html = render(<JsSandbox lang="en" initialCode="console.log(1+1)" />);
    expect(html).toContain("console.log(1+1)");
    expect(html).toContain("Write code");
  });

  test("shows a placeholder when there is no starter code", () => {
    const html = render(<JsSandbox lang="ru" />);
    expect(html).toContain("здесь твой код");
  });
});
