import { describe, it, expect } from "vitest";
import { cardsFromRetrieval, cardsFromPractice, HARVEST_MAX } from "./review-harvest";

describe("review-harvest", () => {
  it("cardsFromRetrieval reads q + a, tags source, derives a stable key by position", () => {
    const qs = [
      { q: "Why does a stale estimate cascade?", a: "Nodes above re-plan on a wrong size." },
      { q: "What is a hash join's build side?", a: "The smaller input, hashed in memory." },
    ];
    const a = cardsFromRetrieval("databases/03-plans/07-stability", "en", qs);
    const b = cardsFromRetrieval("databases/03-plans/07-stability", "en", qs);
    expect(a).toHaveLength(2);
    expect(a[0].source).toBe("retrieval");
    expect(a[0].cardKey).toBe("databases/03-plans/07-stability::retrieval::0");
    expect(a[0].front).toBe("Why does a stale estimate cascade?");
    expect(a[0].back).toBe("Nodes above re-plan on a wrong size.");
    expect(b[0].cardKey).toBe(a[0].cardKey); // stable across calls
  });

  it("cardsFromRetrieval falls back to `answer` when `a` is absent (MDX/type prop drift)", () => {
    const qs = [{ q: "front", answer: "back-from-answer" }];
    expect(cardsFromRetrieval("x", "en", qs)[0].back).toBe("back-from-answer");
  });

  it("cardsFromPractice uses task.id in the key and prompt→front, title→back", () => {
    const tasks = [
      { id: "predict-pool", title: { en: "Pool sizing", ru: "Размер пула" }, prompt: { en: "What happens at maxSockets=∞?", ru: "Что при maxSockets=∞?" } },
    ];
    const cards = cardsFromPractice("node/05-http/02-pooling", "en", tasks);
    expect(cards).toHaveLength(1);
    expect(cards[0].source).toBe("practice");
    expect(cards[0].cardKey).toBe("node/05-http/02-pooling::practice::predict-pool");
    expect(cards[0].front).toBe("What happens at maxSockets=∞?");
    expect(cards[0].back).toBe("Pool sizing");
  });

  it("uses the ru variant of practice text when lang is ru", () => {
    const tasks = [{ id: "t", title: { en: "T", ru: "Т" }, prompt: { en: "P", ru: "П" } }];
    const c = cardsFromPractice("k", "ru", tasks)[0];
    expect(c.front).toBe("П");
    expect(c.back).toBe("Т");
    expect(c.lang).toBe("ru");
  });

  it("skips questions whose q/answer are JSX (non-string), keeping position index stable", () => {
    const qs = [
      { q: "string front", a: "string back" },
      { q: { jsx: true } as unknown, a: "x" }, // JSX body → skipped
    ];
    const cards = cardsFromRetrieval("k", "en", qs);
    expect(cards).toHaveLength(1);
    expect(cards[0].cardKey).toBe("k::retrieval::0");
  });

  it("truncates front/back to HARVEST_MAX chars to bound localStorage growth", () => {
    const long = "x".repeat(HARVEST_MAX + 500);
    const c = cardsFromRetrieval("k", "en", [{ q: long, a: long }])[0];
    expect(c.front.length).toBe(HARVEST_MAX);
    expect(c.back.length).toBe(HARVEST_MAX);
  });
});
