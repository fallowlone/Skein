import { describe, it, expect } from "vitest";
import { addByoCards } from "./cards";

describe("addByoCards", () => {
  it("grades each new-word id once to create a card", () => {
    const calls: string[] = [];
    const created = addByoCards(["ngsl:2", "nawl:1"], (id) => calls.push(id));
    expect(calls).toEqual(["ngsl:2", "nawl:1"]);
    expect(created).toBe(2);
  });

  it("dedupes ids and skips empties", () => {
    const calls: string[] = [];
    const created = addByoCards(["ngsl:2", "ngsl:2", ""], (id) => calls.push(id));
    expect(calls).toEqual(["ngsl:2"]);
    expect(created).toBe(1);
  });
});
