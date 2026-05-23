import { describe, expect, test } from "vitest";
import { render } from "preact-render-to-string";
import SqlSandbox from "./SqlSandbox";

describe("SqlSandbox (shell)", () => {
  test("renders an editor seeded with the starter SQL and a Run button", () => {
    const html = render(<SqlSandbox lang="en" setup="CREATE TABLE t(x int);" initialSql="SELECT 1;" />);
    expect(html).toContain("SELECT 1;");
    expect(html).toContain("Run");
  });
});
