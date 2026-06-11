import { describe, it, expect } from "vitest";
import { appendHours, summarize, type HourEntry } from "./hours";

const e = (date: string, min: number, kind: HourEntry["kind"] = "input-active"): HourEntry => ({ date, min, kind });

describe("hours", () => {
  it("appendHours merges same-day same-kind entries and caps the log", () => {
    let log: HourEntry[] = [];
    log = appendHours(log, e("2026-06-11", 30));
    log = appendHours(log, e("2026-06-11", 15));
    log = appendHours(log, e("2026-06-11", 10, "srs"));
    expect(log).toHaveLength(2);
    expect(log.find((x) => x.kind === "input-active")!.min).toBe(45);
  });
  it("summarize: totals, this-week, today", () => {
    const log = [e("2026-06-11", 60), e("2026-06-10", 30, "srs"), e("2026-05-01", 120)];
    const s = summarize(log, "2026-06-11", "2026-06-08"); // today, monday of this week
    expect(s.totalMin).toBe(210);
    expect(s.weekMin).toBe(90);
    expect(s.todayMin).toBe(60);
    expect(s.byKind["input-active"]).toBe(180);
  });
});
