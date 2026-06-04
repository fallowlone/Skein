import { describe, it, expect } from "vitest";
import { lintLabData, aggregateLab } from "./lab";

const ok = {
  track: "node", tier: "build", order: 1,
  title: { en: "Build", ru: "Стройка" },
  intro: { en: "Build real things.", ru: "Строй настоящее." },
  challenges: [
    {
      id: "b-1", type: "design", difficulty: "apply", estMin: 30,
      title: { en: "Static server", ru: "Статик-сервер" },
      prompt: { en: "Build a static file server on net.", ru: "Собери статик-сервер на net." },
      constraints: { en: "No frameworks.", ru: "Без фреймворков." },
      rubric: [{ en: "Streams the file", ru: "Стримит файл" }, { en: "Handles 404", ru: "Обрабатывает 404" }],
      model: { en: "Use net.createServer + createReadStream.", ru: "Используй net.createServer + createReadStream." },
    },
  ],
};

describe("lintLabData", () => {
  it("passes clean data", () => {
    expect(lintLabData("f.json", ok).errors).toEqual([]);
  });
  it("flags untranslated en===ru", () => {
    const dup = "Build a static file server on raw net";
    const bad = { ...ok, challenges: [{ ...ok.challenges[0], prompt: { en: dup, ru: dup } }] };
    expect(lintLabData("f.json", bad).errors.some((e) => e.includes("untranslated"))).toBe(true);
  });
  it("exempts evidence from the en===ru check", () => {
    const code = "process.nextTick(() => spin()); // identical code in both locales";
    const okEv = { ...ok, challenges: [{ ...ok.challenges[0], evidence: { en: code, ru: code } }] };
    expect(lintLabData("f.json", okEv).errors.some((e) => e.includes("untranslated"))).toBe(false);
  });
  it("flags whitespace-only field", () => {
    const bad = { ...ok, intro: { en: "Build real things.", ru: "   " } };
    expect(lintLabData("f.json", bad).errors.some((e) => e.includes("whitespace"))).toBe(true);
  });
});

describe("aggregateLab", () => {
  it("flags duplicate challenge ids across files of one track", () => {
    const res = aggregateLab([
      { file: "a.json", data: ok },
      { file: "b.json", data: { ...ok, tier: "diagnose", order: 2 } },
    ]);
    expect(res.errors.some((e) => e.includes("duplicated"))).toBe(true);
  });
  it("flags a track missing a required tier", () => {
    const res = aggregateLab([{ file: "a.json", data: ok }]);
    expect(res.errors.some((e) => e.includes("missing tier"))).toBe(true);
  });
});
