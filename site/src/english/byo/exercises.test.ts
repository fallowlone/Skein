import { describe, it, expect } from "vitest";
import { generateExercisesWith, type ExerciseDeps } from "./exercises";

const fakeJson = {
  cloze: [{ sentence: "The ___ absorbs load.", answer: "queue" }],
  comprehension: [{ q: "What absorbs load?", a: "the queue" }],
  retell: "Explain backpressure in two sentences.",
};

function deps(json: unknown, ok = true, status = 200): ExerciseDeps {
  return {
    withKey: async (fn) => fn("sk-test"),
    model: "claude-haiku-4-5",
    fetch: (async () => ({
      ok,
      status,
      json: async () => ({ content: [{ type: "text", text: JSON.stringify(json) }] }),
    })) as unknown as typeof fetch,
  };
}

describe("generateExercisesWith", () => {
  it("parses the model's JSON into cloze/comprehension/retell", async () => {
    const r = await generateExercisesWith("Backpressure bounds a queue.", deps(fakeJson));
    expect(r.cloze[0].answer).toBe("queue");
    expect(r.comprehension[0].q).toMatch(/load/i);
    expect(r.retell).toMatch(/backpressure/i);
  });

  it("throws on a non-ok response (caller shows a retry state)", async () => {
    await expect(generateExercisesWith("x", deps({}, false, 500))).rejects.toThrow();
  });

  it("tolerates a fenced ```json block in the model output", async () => {
    const fenced: ExerciseDeps = {
      withKey: async (fn) => fn("sk-test"),
      model: "claude-haiku-4-5",
      fetch: (async () => ({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: "text", text: "```json\n" + JSON.stringify(fakeJson) + "\n```" }] }),
      })) as unknown as typeof fetch,
    };
    const r = await generateExercisesWith("x", fenced);
    expect(r.cloze[0].answer).toBe("queue");
  });
});
