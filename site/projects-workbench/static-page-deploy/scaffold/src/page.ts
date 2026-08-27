import { describe, test, expect } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
describe("static page deploy", () => {
  test("has viewport meta", () => {
    const html = readFileSync("artifact/index.html","utf-8");
    expect(html.includes('name="viewport"')).toBe(true);
  });
  test("image has explicit dimensions", () => {
    const html = readFileSync("artifact/index.html","utf-8");
    expect(html.includes("width=") && html.includes("height=")).toBe(true);
  });
  test("has 404.html", () => {
    expect(existsSync("artifact/404.html")).toBe(true);
  });
});
