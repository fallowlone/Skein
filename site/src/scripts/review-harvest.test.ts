import { describe, it, expect } from "vitest";
import { cardsFromRetrieval, cardsFromPractice, HARVEST_MAX } from "./review-harvest";

describe("review-harvest", () => {
  it("cardsFromRetrieval uses the canonical lesson identity and carries the old key for migration", () => {
    const qs = [
      { q: "Why does a stale estimate cascade?", a: "Nodes above re-plan on a wrong size." },
      { q: "What is a hash join's build side?", a: "The smaller input, hashed in memory." },
    ];
    const a = cardsFromRetrieval("07-stability-retrieval", "databases/03-execution-plans/07-plan-stability", "en", qs);
    const b = cardsFromRetrieval("07-stability-retrieval", "databases/03-execution-plans/07-plan-stability", "en", qs);
    expect(a).toHaveLength(2);
    expect(a[0].source).toBe("retrieval");
    expect(a[0].cardKey).toBe("databases/03-execution-plans/07-plan-stability::retrieval::0");
    expect(a[0].legacyCardKey).toBe("07-stability-retrieval::retrieval::0");
    expect(a[0].lessonKey).toBe("databases/03-execution-plans/07-plan-stability");
    expect(a[0].front).toBe("Why does a stale estimate cascade?");
    expect(a[0].back).toBe("Nodes above re-plan on a wrong size.");
    expect(b[0].cardKey).toBe(a[0].cardKey);
  });

  it("cardsFromRetrieval falls back to `answer` when `a` is absent (MDX/type prop drift)", () => {
    const qs = [{ q: "front", answer: "back-from-answer" }];
    expect(cardsFromRetrieval("x", "x", "en", qs)[0].back).toBe("back-from-answer");
  });

  it("cardsFromPractice harvests an authored answer and explicit concept ids", () => {
    const tasks = [
      {
        id: "predict-pool",
        type: "predict",
        title: { en: "Pool sizing", ru: "Размер пула" },
        prompt: { en: "What happens at maxSockets=∞?", ru: "Что при maxSockets=∞?" },
        reveal: { en: "The queue moves into the kernel and latency becomes unbounded.", ru: "Очередь уходит в ядро, а задержка становится неограниченной." },
        concepts: ["socket-backpressure"],
      },
    ];
    const cards = cardsFromPractice("node/05-http/02-pooling", "en", tasks);
    expect(cards).toHaveLength(1);
    expect(cards[0].source).toBe("practice");
    expect(cards[0].cardKey).toBe("node/05-http/02-pooling::practice::predict-pool");
    expect(cards[0].front).toBe("What happens at maxSockets=∞?");
    expect(cards[0].back).toBe("The queue moves into the kernel and latency becomes unbounded.");
    expect(cards[0].answerMode).toBe("inline");
    expect(cards[0].taskId).toBe("predict-pool");
    expect(cards[0].conceptIds).toEqual(["socket-backpressure"]);
  });

  it("uses the ru variant of authored practice text", () => {
    const tasks = [{ id: "t", type: "design", title: { en: "T", ru: "Т" }, prompt: { en: "P", ru: "П" }, model: { en: "A", ru: "О" } }];
    const c = cardsFromPractice("k", "ru", tasks)[0];
    expect(c.front).toBe("П");
    expect(c.back).toBe("О");
    expect(c.lang).toBe("ru");
  });

  it("harvests a sandbox model as an inline delayed-review answer", () => {
    const tasks = [{
      id: "transfer-runtime",
      type: "sandbox",
      title: { en: "Port it", ru: "Перенеси" },
      prompt: { en: "Implement against the documented host API.", ru: "Реализуй через документированный API host." },
      model: { en: "Call host.queueMicrotask(fn).", ru: "Вызови host.queueMicrotask(fn)." },
      concepts: ["microtask-queue"],
    }];
    const c = cardsFromPractice("browser/01-event-loop/05-node-differences", "en", tasks)[0];
    expect(c).toMatchObject({
      answerMode: "inline",
      taskId: "transfer-runtime",
      back: "Call host.queueMicrotask(fn).",
      conceptIds: ["microtask-queue"],
    });
  });

  it("routes tasks without a sufficient authored answer back to the original task", () => {
    const tasks = [{ id: "run-it", type: "sandbox", title: { en: "Run it", ru: "Запусти" }, prompt: { en: "Make the hidden checks pass.", ru: "Добейся прохождения скрытых проверок." }, concepts: [] }];
    const c = cardsFromPractice("node/05-http/02-pooling", "en", tasks)[0];
    expect(c).toMatchObject({ answerMode: "original-task", taskId: "run-it", back: "" });
    expect(c.conceptIds).toBeUndefined();
  });

  it("routes overlong prompt/answer pairs instead of truncating them into an unsolvable card", () => {
    const long = "x".repeat(HARVEST_MAX + 1);
    const c = cardsFromPractice("node/05-http/02-pooling", "en", [{
      id: "long", type: "predict", title: { en: "Long task", ru: "Длинная задача" },
      prompt: { en: long, ru: long }, reveal: { en: "answer", ru: "ответ" },
    }])[0];
    expect(c).toMatchObject({ answerMode: "original-task", front: "Long task", back: "" });
  });

  it("skips questions whose q/answer are JSX (non-string), keeping position index stable", () => {
    const qs = [
      { q: "string front", a: "string back" },
      { q: { jsx: true } as unknown, a: "x" }, // JSX body → skipped
    ];
    const cards = cardsFromRetrieval("k", "k", "en", qs);
    expect(cards).toHaveLength(1);
    expect(cards[0].cardKey).toBe("k::retrieval::0");
  });

  it("truncates front/back to HARVEST_MAX chars to bound localStorage growth", () => {
    const long = "x".repeat(HARVEST_MAX + 500);
    const c = cardsFromRetrieval("k", "k", "en", [{ q: long, a: long }])[0];
    expect(c.front.length).toBe(HARVEST_MAX);
    expect(c.back.length).toBe(HARVEST_MAX);
  });
});
