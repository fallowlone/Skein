// src/scripts/path/pace.test.ts
import { describe, it, expect } from "vitest";
import { pace } from "./pace";

const DAY = 86_400_000;
const start = Date.UTC(2026, 5, 1);
const target = start + 100 * DAY;

describe("pace", () => {
  it("on-track: done matches the elapsed fraction", () => {
    const now = start + 50 * DAY;               // 50% elapsed
    const p = pace(1000, 500, start, now, target); // baseline 1000, 500 remaining → 500 done = 50%
    expect(p.doneMin).toBe(500);
    expect(p.expectedDoneMin).toBe(500);
    expect(p.status).toBe("on-track");
    expect(p.behindDays).toBe(0);
  });

  it("behind: done lags the elapsed fraction and projects past the target", () => {
    const now = start + 50 * DAY;
    const p = pace(1000, 800, start, now, target); // only 200 done at 50% elapsed
    expect(p.doneMin).toBe(200);
    expect(p.status).toBe("behind");
    expect(p.projectedFinishMs).toBeGreaterThan(target);
    expect(p.behindDays).toBeGreaterThan(0);
  });

  it("ahead: done exceeds expectation", () => {
    const now = start + 25 * DAY;                // 25% elapsed
    const p = pace(1000, 400, start, now, target); // 600 done already
    expect(p.status).toBe("ahead");
  });

  it("no-data before the elapsed floor (avoids day-0 noise)", () => {
    const now = start + 1 * DAY;                 // 1% elapsed
    expect(pace(1000, 1000, start, now, target).status).toBe("no-data");
  });

  it("projectedFinish is null when nothing is done yet (rate 0)", () => {
    const now = start + 50 * DAY;
    expect(pace(1000, 1000, start, now, target).projectedFinishMs).toBeNull();
  });
});
