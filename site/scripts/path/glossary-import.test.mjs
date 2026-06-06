import { describe, it, expect } from "vitest";
import { glossaryRuMap } from "./glossary-import.mjs";

const GLOSSARY = {
  abstract_data_type: { en: "Abstract data type", ru: "Абстрактный тип данных" },
  "0rtt": { en: "0-RTT", ru: "0-RTT" }, // ru === en → skipped
  access_token: { en: "Access token", ru: "Токен доступа" },
};
const CONCEPTS = [
  { id: "abstract-data-type", label: { en: "Abstract data type", ru: "Abstract data type" } },
  { id: "access-token", label: { en: "Access token", ru: "Access token" } },
  { id: "0rtt", label: { en: "0-RTT", ru: "0-RTT" } },
  { id: "no-glossary", label: { en: "No glossary", ru: "No glossary" } },
];

describe("glossaryRuMap", () => {
  it("matches concept ids to glossary keys via underscore/hyphen normalization", () => {
    const m = glossaryRuMap(GLOSSARY, CONCEPTS);
    expect(m["abstract-data-type"]).toBe("Абстрактный тип данных");
    expect(m["access-token"]).toBe("Токен доступа");
  });
  it("skips glossary entries whose ru equals en", () => {
    expect(glossaryRuMap(GLOSSARY, CONCEPTS)["0rtt"]).toBeUndefined();
  });
  it("omits concepts with no glossary match", () => {
    const m = glossaryRuMap(GLOSSARY, CONCEPTS);
    expect(m["no-glossary"]).toBeUndefined();
    expect(Object.keys(m)).toHaveLength(2);
  });
});
