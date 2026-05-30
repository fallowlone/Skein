import { describe, it, expect, vi } from "vitest";
import { gradeWithClient, type GradeDeps } from "./anthropic";
import type { OutputTask } from "~/english/types";

const task: OutputTask = {
  id: "t1", band: "B1", type: "standup",
  prompt: { en: "Write a standup update.", ru: "..." },
  rubric: ["clarity", "correct tense"],
};

const valid = {
  corrections: [], betterVersion: "Yesterday I fixed the bug.", scoreBand: "B1", noticingHints: [],
};

function depsWith(fetchImpl: any): GradeDeps {
  return {
    fetch: fetchImpl,
    withKey: async (fn: (k: string) => Promise<any>) => fn("sk-ant-test"),
    model: "claude-haiku-4-5",
    now: () => 1_000_000,
  };
}

describe("gradeWithClient", () => {
  it("sends the key in x-api-key and returns a parsed result", async () => {
    let sentHeaders: any = {};
    const fetchImpl = vi.fn(async (_url: string, init: any) => {
      sentHeaders = init.headers;
      return { ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(valid) }] }) };
    });
    const res = await gradeWithClient(task, "Yesterday I fix the bug.", depsWith(fetchImpl));
    expect(sentHeaders["x-api-key"]).toBe("sk-ant-test");
    expect(sentHeaders["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(res.scoreBand).toBe("B1");
  });

  it("rejects over-long input before calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(
      gradeWithClient(task, "x".repeat(10_000), depsWith(fetchImpl)),
    ).rejects.toThrow(/too long/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws a typed error on HTTP failure without leaking the key", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "bad key" } }) }));
    await expect(gradeWithClient(task, "short answer", depsWith(fetchImpl))).rejects.toThrow(/grading failed/i);
  });
});
