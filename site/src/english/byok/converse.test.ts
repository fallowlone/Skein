import { describe, it, expect, vi } from "vitest";
import { converseWithClient, type ConverseDeps } from "./converse";
import type { Scenario, ConversationTurn } from "~/english/types";

const scenario: Scenario = {
  id: "code-review", level: "B1", role: "a senior engineer reviewing your PR",
  goal: "defend your design choices", opening: "Thanks for the PR. Why a queue here?", titleRu: "Код-ревью",
};
function deps(fetchImpl: any): ConverseDeps {
  return { fetch: fetchImpl, withKey: async (fn: any) => fn("sk-ant-test"), model: "claude-haiku-4-5" };
}

describe("converseWithClient", () => {
  it("caches the scenario system block and returns the assistant reply", async () => {
    let body: any = {};
    const fetchImpl = vi.fn(async (_u: string, init: any) => {
      body = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: "Because spikes would drop requests." }] }) };
    });
    const history: ConversationTurn[] = [
      { role: "assistant", text: scenario.opening },
      { role: "user", text: "To absorb load spikes." },
    ];
    const reply = await converseWithClient(history, scenario, deps(fetchImpl));
    expect(reply).toContain("spikes");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.system[0].text).toContain(scenario.role);
    expect(body.messages.at(-1)).toEqual({ role: "user", content: "To absorb load spikes." });
    expect(body.max_tokens).toBeLessThanOrEqual(320);
  });
});
