import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import JsSandbox from "./JsSandbox";

describe("JsSandbox (shell)", () => {
  test("renders the editor with starter code and a Run button", () => {
    const html = render(<JsSandbox lang="en" initialCode="console.log(1+1)" />);
    expect(html).toContain("console.log(1+1)");
    expect(html).toContain("Run");
  });
});
