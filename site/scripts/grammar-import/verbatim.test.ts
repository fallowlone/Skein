import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mapSteepTopic, kebab, type SteepTopic } from "./map";

const SRC = process.env.STEEP_GRAMMAR_DIR
  ?? "/Users/artemmac/dev/personal/steep/grammar/explanations/data";

// A handful of representative topics across bands.
const SAMPLE = ["present_simple", "third_conditional", "article_with_proper_nouns", "inversion"];

describe("RU prose is preserved verbatim from steep", () => {
  it.skipIf(!existsSync(SRC))("matches committed corpus RU explain/tip for samples", async () => {
    for (const topicId of SAMPLE) {
      const file = join(SRC, `${topicId}.json`);
      if (!existsSync(file)) continue;
      const raw = JSON.parse(readFileSync(file, "utf8")) as SteepTopic;
      const mapped = mapSteepTopic(raw);
      const committed = (await import(`../../src/english/data/grammar/${kebab(topicId)}.ts`)).topic;
      for (const lv of mapped.levels) {
        expect(committed.lessons[lv].explain.ru).toBe(mapped.lessons[lv]!.explain.ru);
        expect(committed.lessons[lv].tip.ru).toBe(mapped.lessons[lv]!.tip.ru);
      }
    }
  });
});
