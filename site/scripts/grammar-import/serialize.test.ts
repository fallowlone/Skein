import { describe, it, expect } from "vitest";
import { serializeTopic } from "./serialize";
import { mapSteepTopic, type SteepTopic } from "./map";

const fixture: SteepTopic = {
  topicId: "present_simple",
  levels: { A1: { content: "Строка с \"кавычками\"\nи переносом.", examples: ["I work. (Я работаю.)"], tip: "Совет." } },
};

describe("serializeTopic", () => {
  const text = serializeTopic(mapSteepTopic(fixture));

  it("imports the type and exports a `topic` const", () => {
    expect(text).toContain('import type { GrammarTopic } from "~/english/grammar-types";');
    expect(text).toContain("export const topic: GrammarTopic =");
  });
  it("round-trips through JSON (the literal is valid JSON)", () => {
    // Slice the object literal: first "{" AFTER the export keyword (the import
    // line above also contains braces) through the final "}".
    const start = text.indexOf("{", text.indexOf("export const topic"));
    const json = text.slice(start, text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe("present-simple");
    expect(parsed.lessons.A1.explain.ru).toContain("переносом");
  });
});
