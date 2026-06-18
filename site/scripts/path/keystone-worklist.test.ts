import { test, expect } from "vitest";
import { readFileSync } from "node:fs";

const wl = JSON.parse(readFileSync("src/content/path/keystone-worklist.json", "utf8"));
const diag = new Set(JSON.parse(readFileSync("src/content/path/diagnostics-index.json", "utf8")));

test("worklist meaningfully expands coverage and excludes already-diagnosable", () => {
  const sum = wl.rows.reduce((n: number, r: { marginal: number }) => n + r.marginal, 0);
  expect(sum).toBeGreaterThan(600);
  for (const r of wl.rows) expect(diag.has(r.id)).toBe(false);
  // marginals are non-increasing (greedy set-cover pick order)
  for (let i = 1; i < wl.rows.length; i++) {
    expect(wl.rows[i].marginal).toBeLessThanOrEqual(wl.rows[i - 1].marginal);
  }
});

test("worklist shape is valid", () => {
  expect(wl.goal).toBe("job-ready-junior");
  expect(wl.k).toBe(200);
  expect(wl.rows.length).toBeGreaterThan(0);
  expect(wl.rows.length).toBeLessThanOrEqual(200);
  for (const r of wl.rows) {
    expect(typeof r.id).toBe("string");
    expect(typeof r.label).toBe("string");
    expect(typeof r.band).toBe("string");
    expect(typeof r.track).toBe("string");
    expect(typeof r.marginal).toBe("number");
    expect(r.marginal).toBeGreaterThan(0);
  }
});
