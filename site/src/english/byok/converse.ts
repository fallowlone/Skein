import type { Scenario, ConversationTurn, SpeechReview } from "~/english/types";
import { withKey as defaultWithKey } from "./index";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
export const MAX_TURNS = 10;

export type GradeModel = "claude-haiku-4-5" | "claude-sonnet-4-6";
export type ConverseDeps = {
  fetch: typeof fetch;
  withKey: <T>(fn: (key: string) => Promise<T>) => Promise<T>;
  model: GradeModel;
};

/** Shared POST to /v1/messages. system blocks should carry cache_control. */
export async function postMessages(body: object, deps: ConverseDeps): Promise<any> {
  const res = await deps.withKey(async (key) =>
    deps.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    }),
  );
  if (!res.ok) throw new Error(`request failed (HTTP ${res.status})`);
  return res.json();
}

function systemFor(s: Scenario): string {
  return `You are role-playing ${s.role} in a spoken English practice conversation with a software engineer learning English (level ${s.level}).
The learner's goal: ${s.goal}. Stay in character. Keep EVERY reply to at most 2 short sentences.
Speak natural, current professional English. Do not correct the learner mid-conversation; just converse.`;
}

export async function converseWithClient(history: ConversationTurn[], scenario: Scenario, deps: ConverseDeps): Promise<string> {
  const messages = history.map((t) => ({ role: t.role, content: t.text }));
  const data = await postMessages({
    model: deps.model,
    max_tokens: 300,
    system: [{ type: "text", text: systemFor(scenario), cache_control: { type: "ephemeral" } }],
    messages,
  }, deps);
  return (data?.content?.[0]?.text ?? "").trim();
}

export function converse(history: ConversationTurn[], scenario: Scenario, model: GradeModel = "claude-haiku-4-5"): Promise<string> {
  return converseWithClient(history, scenario, { fetch: fetch.bind(globalThis), withKey: defaultWithKey, model });
}

// endReview + parseReview are added in Task 8.
export function parseReview(_text: string): SpeechReview | null { return null; }
