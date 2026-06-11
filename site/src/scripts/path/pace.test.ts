// src/scripts/path/pace.test.ts
import { describe, it, expect } from "vitest";
import { pace } from "./pace";

const DAY = 86_400_000;
const D0 = Date.UTC(2026, 6, 1); // 2026-07-01 — "now" in all tests
const iso = (i: number) => new Date(D0 + i * DAY).toISOString().slice(0, 10);
// n future study days of `min` minutes each, starting today (2026-07-01).
const futureDays = (n: number, min = 120) =>
  Array.from({ length: n }, (_, i) => ({ date: iso(i), minutes: min }));

const base = {
  baselineMin: 1000, currentRequiredMin: 500,
  elapsedAvailMin: 600, totalAvailMin: 1200,
  futureDays: futureDays(40), targetMs: D0 + 14 * DAY, nowMs: D0,
};

describe("pace", () => {
  it("on-track: done matches the elapsed share of planned study minutes", () => {
    const p = pace(base); // 500 done vs expected 1000 * (600/1200) = 500
    expect(p.doneMin).toBe(500);
    expect(p.expectedDoneMin).toBe(500);
    expect(p.status).toBe("on-track");
  });

  it("behind: done lags planned minutes; projection walks the study-day calendar", () => {
    const p = pace({ ...base, currentRequiredMin: 800 }); // 200 done at 50% of planned minutes
    expect(p.status).toBe("behind");
    // rate = 200/600 per planned minute; 800 remaining needs 2400 planned minutes = 20 study
    // days from 2026-07-01 → finishes 2026-07-20, 5 days past the 2026-07-15 target.
    expect(p.projectedFinishMs).toBe(Date.parse("2026-07-20T00:00:00Z"));
    expect(p.behindDays).toBe(5);
  });

  it("ahead: done exceeds the planned-minutes expectation", () => {
    expect(pace({ ...base, currentRequiredMin: 200 }).status).toBe("ahead"); // 800 done vs 500 expected
  });

  it("no-data before the elapsed floor (avoids day-0 noise)", () => {
    expect(pace({ ...base, elapsedAvailMin: 30, currentRequiredMin: 1000 }).status).toBe("no-data"); // 2.5% < 5%
  });

  it("projectedFinish is null when nothing is done yet (rate 0)", () => {
    expect(pace({ ...base, currentRequiredMin: 1000 }).projectedFinishMs).toBeNull();
  });

  it("projection beyond the supplied horizon clamps to the last horizon day", () => {
    // needs 20 study days, only 5 supplied → clamps to 2026-07-05 (status is still ratio-driven)
    const p = pace({ ...base, currentRequiredMin: 800, futureDays: futureDays(5) });
    expect(p.projectedFinishMs).toBe(Date.parse("2026-07-05T00:00:00Z"));
    expect(p.status).toBe("behind");
  });

  it("scope growth never reads as negative progress", () => {
    const p = pace({ ...base, currentRequiredMin: 1500 }); // required above baseline
    expect(p.doneMin).toBe(0);
    expect(p.status).toBe("behind");
  });
});
