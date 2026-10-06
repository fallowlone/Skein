import { describe, expect, it } from "vitest";
import { hourWord } from "./plural";

describe("hourWord", () => {
  it("uses hour/hours in English", () => {
    expect(hourWord(1, "en")).toBe("hour");
    expect(hourWord(2, "en")).toBe("hours");
    expect(hourWord(12, "en")).toBe("hours");
  });

  it("declines час/часа/часов in Russian", () => {
    expect(hourWord(1, "ru")).toBe("час");
    expect(hourWord(21, "ru")).toBe("час");
    expect(hourWord(101, "ru")).toBe("час");
    expect(hourWord(2, "ru")).toBe("часа");
    expect(hourWord(4, "ru")).toBe("часа");
    expect(hourWord(22, "ru")).toBe("часа");
    expect(hourWord(5, "ru")).toBe("часов");
    expect(hourWord(11, "ru")).toBe("часов");
    expect(hourWord(12, "ru")).toBe("часов");
    expect(hourWord(25, "ru")).toBe("часов");
    expect(hourWord(111, "ru")).toBe("часов");
  });
});
