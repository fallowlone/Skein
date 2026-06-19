import { describe, it, expect, beforeEach, vi } from "vitest";
import { userState, recordActiveDay, resetAll } from "./user-state";

// The daily habit loop: recordActiveDay advances the streak once per day and
// fires a "toast" event so the UI can show the closing ritual.
describe("recordActiveDay habit loop", () => {
  beforeEach(() => {
    localStorage.clear();
    resetAll();
  });

  it("increments the streak and fires a toast on the first active day", () => {
    const onToast = vi.fn();
    window.addEventListener("toast", onToast);
    recordActiveDay();
    window.removeEventListener("toast", onToast);
    expect(userState.value.progression.streak.count).toBe(1);
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it("does not re-fire on the same day", () => {
    recordActiveDay();
    const onToast = vi.fn();
    window.addEventListener("toast", onToast);
    recordActiveDay(); // same day → no-op, no toast
    window.removeEventListener("toast", onToast);
    expect(onToast).not.toHaveBeenCalled();
  });
});
