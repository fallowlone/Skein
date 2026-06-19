import { describe, it, expect } from "vitest";
import { gt } from "./strings";

const KEYS = ["plan_tab","browse_tab","goal_title","goal_target","goal_deadline","goal_hours","goal_save","goal_change","fc_fits","fc_under","fc_over","fc_countdown","today_title","plan_full_title","plan_empty","locked_band"];

describe("planner strings", () => {
  it("every planner key resolves non-empty in EN and RU, and is translated", () => {
    for (const k of KEYS) {
      expect(gt(k, "en"), `${k}.en`).toBeTruthy();
      expect(gt(k, "ru"), `${k}.ru`).toBeTruthy();
      expect(gt(k, "en")).not.toBe(gt(k, "ru"));
    }
  });
});
