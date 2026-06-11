import { describe, it, expect } from "vitest";
import { dailyPlan } from "./daily";

describe("dailyPlan", () => {
  const base = { dueCount: 12, todaySrsMin: 0, todayInputMin: 0, todayOutputMin: 0, dayOfMonth: 11 };
  it("three blocks in methodology order with remaining minutes", () => {
    const p = dailyPlan(base);
    expect(p.map((b) => b.key)).toEqual(["srs", "input", "output"]);
    expect(p[0].remainingMin).toBe(15);
    expect(p[1].remainingMin).toBe(45);
  });
  it("blocks done today report zero remaining; output alternates writing/speaking by day parity", () => {
    const p = dailyPlan({ ...base, todaySrsMin: 20, dayOfMonth: 12 });
    expect(p[0].remainingMin).toBe(0);
    expect(p[2].mode).toBe("speaking"); // even day; 11 → "writing"
  });
  it("no due cards → srs block still suggests mining review of zero and stays first", () => {
    expect(dailyPlan({ ...base, dueCount: 0 })[0].key).toBe("srs");
  });
});
