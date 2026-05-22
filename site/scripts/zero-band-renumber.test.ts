import { describe, it, expect } from "vitest";
import { transform, transformAll, FULLSTACK, ORIENTATION } from "./zero-band-renumber.mjs";

type Unit = {
  slug: string;
  track: string;
  order: number;
  title: { en: string; ru: string };
  crux: { en: string; ru: string };
  lessons: string[];
};

const sample: Unit[] = [
  { slug: "01-a", track: "databases", order: 1, title: { en: "A", ru: "А" }, crux: { en: "a", ru: "а" }, lessons: ["01-x"] },
  { slug: "02-b", track: "databases", order: 2, title: { en: "B", ru: "Б" }, crux: { en: "b", ru: "б" }, lessons: ["01-y"] },
  { slug: "01-m", track: "math", order: 1, title: { en: "M", ru: "М" }, crux: { en: "m", ru: "м" }, lessons: ["01-z"] },
];

describe("transform", () => {
  it("bumps existing unit orders +1 for the target track only", () => {
    const out = transform(sample, "databases", ORIENTATION.databases);
    expect(out.find((u: Unit) => u.slug === "01-a").order).toBe(2);
    expect(out.find((u: Unit) => u.slug === "02-b").order).toBe(3);
    expect(out.find((u: Unit) => u.slug === "01-m").order).toBe(1); // math untouched
  });

  it("inserts a 00-orientation unit at order 1", () => {
    const out = transform(sample, "databases", ORIENTATION.databases);
    const o = out.find((u: Unit) => u.track === "databases" && u.slug === "00-orientation");
    expect(o).toBeTruthy();
    expect(o.order).toBe(1);
    expect(o.lessons).toEqual(["01-orientation"]);
    expect(o.title.en.length).toBeGreaterThan(0);
    expect(o.crux.ru.length).toBeGreaterThan(0);
  });

  it("is idempotent — second run is a no-op", () => {
    const once = transform(sample, "databases", ORIENTATION.databases);
    const twice = transform(once, "databases", ORIENTATION.databases);
    expect(twice).toEqual(once);
  });

  it("transformAll covers all 16 fullstack tracks and has orientation metadata for each", () => {
    expect(FULLSTACK).toHaveLength(16);
    for (const t of FULLSTACK) {
      const o = ORIENTATION[t as keyof typeof ORIENTATION];
      expect(o?.title?.en, `missing title for ${t}`).toBeTruthy();
      expect(o?.crux?.ru, `missing crux for ${t}`).toBeTruthy();
    }
  });
});
