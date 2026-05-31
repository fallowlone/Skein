import { describe, it, expect, vi } from "vitest";
import { gradeSpeechWithClient, type SpeechGradeDeps } from "./speech";
import type { OutputTask } from "~/english/types";

const task: OutputTask = {
  id: "s1", band: "B1", type: "standup",
  prompt: { en: "Give a spoken standup update.", ru: "..." },
  rubric: ["clear sequence", "correct tense"],
};
const valid = { corrections: [], betterVersion: "Yesterday I fixed the flaky test.", scoreBand: "B1", noticingHints: [] };

function depsWith(fetchImpl: any): SpeechGradeDeps {
  return { fetch: fetchImpl, withKey: async (fn: any) => fn("sk-ant-test"), model: "claude-haiku-4-5", now: () => 1 };
}

describe("gradeSpeechWithClient", () => {
  it("sends a speech-tuned system prompt and parses the result", async () => {
    let body: any = {};
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(valid) }] }) };
    });
    const r = await gradeSpeechWithClient(task, "yesterday i fix the flaky test", depsWith(fetchImpl));
    expect(r.scoreBand).toBe("B1");
    expect(body.system[0].text.toLowerCase()).toContain("spoken");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws on empty transcript", async () => {
    await expect(gradeSpeechWithClient(task, "  ", depsWith(vi.fn()))).rejects.toThrow();
  });
});
