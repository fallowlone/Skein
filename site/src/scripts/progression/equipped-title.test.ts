import { describe, it, expect, beforeEach } from "vitest";
import { equippedTitle, setEquippedTitle, EQUIP_KEY } from "./equipped-title";

describe("equipped-title", () => {
  beforeEach(() => { localStorage.removeItem(EQUIP_KEY); setEquippedTitle(null); });
  it("sets and clears the equipped title id, persisting to localStorage", () => {
    setEquippedTitle("packet-whisperer");
    expect(equippedTitle.value).toBe("packet-whisperer");
    expect(localStorage.getItem(EQUIP_KEY)).toBe("packet-whisperer");
    setEquippedTitle(null);
    expect(equippedTitle.value).toBeNull();
    expect(localStorage.getItem(EQUIP_KEY)).toBeNull();
  });
});
