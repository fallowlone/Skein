// @vitest-environment node
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { enumerateUnits } from "./lessons";

// siteSrc is the dir that CONTAINS "content/". Our fixture content lives at __fixtures__/content.
const FIX = fileURLToPath(new URL("./__fixtures__", import.meta.url));

describe("enumerateUnits", () => {
  it("groups lessons by unit, derives keys from path, reads status/level, links practice", async () => {
    const units = await enumerateUnits(FIX);
    expect(units).toHaveLength(1);
    const u = units[0];
    expect(u.unitKey).toBe("demo/01-unit");
    expect(u.lessons.map((l) => l.slug)).toEqual(["01-a", "02-b"]);
    const a = u.lessons[0];
    expect(a.lessonKey).toBe("demo/01-unit/01-a");
    expect(a.status).toBe("ready");
    expect(a.level).toBe("senior");
    expect(a.practicePath).toMatch(/practice\/demo\/01-unit\/01-a\.json$/);
    const b = u.lessons[1];
    expect(b.status).toBe("stub");
    expect(b.level).toBeNull();
    expect(b.practicePath).toBeNull();
  });
});
