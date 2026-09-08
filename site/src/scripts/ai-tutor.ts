import { postMessages, type GradeModel } from "~/english/byok/converse";
import { withKey } from "~/english/byok";
import { readAttempts, readSelfGrades, type SelfGradeRecord } from "~/scripts/practice-state";
import * as practiceState from "~/scripts/practice-state";
import { allCards } from "~/scripts/review-state";
import { userState } from "~/scripts/user-state";

export type TutorMode = "socratic" | "debugging" | "interview" | "hint" | "worked-example";
export type TutorMessage = { role: "user" | "assistant"; content: string };
export const MAX_TUTOR_MESSAGES = 8;

export type TutorRequest = {
  mode: TutorMode;
  lang?: "en" | "ru";
  lessonKey?: string;
  concepts: string[];
  question: string;
  conversation?: TutorMessage[];
  mastery?: Record<string, number>;
  recentMistakes?: RecentMistake[];
};

export type RecentMistake = { source: "practice" | "self-grade" | "retrieval" | "review"; key: string; detail: string; at: number };
export function recentMistakes(lessonKey: string, now = Date.now()): RecentMistake[] {
  void now; // retained for call-site compatibility; timestamps determine recency ordering
  const out: RecentMistake[] = [];
  for (const [key, a] of Object.entries(readAttempts(lessonKey))) if (a.lastResult === "fail") out.push({ source: "practice", key, detail: `failed (${a.attempts} attempts)`, at: a.lastAt });
  let readSelfGradeRecords: ((key: string) => Record<string, SelfGradeRecord>) | undefined;
  try {
    readSelfGradeRecords = (practiceState as typeof practiceState & {
      readSelfGradeRecords?: (key: string) => Record<string, SelfGradeRecord>;
    }).readSelfGradeRecords;
  } catch {
    // Keep partial module mocks and older consumers on the legacy fallback.
  }
  const selfGrades = typeof readSelfGradeRecords === "function"
    ? readSelfGradeRecords(lessonKey)
    : Object.fromEntries(Object.entries(readSelfGrades(lessonKey)).map(([key, grade]) => [key, { grade, lastAt: 0 }]));
  for (const [key, record] of Object.entries(selfGrades)) if (["miss", "partial", "skipped"].includes(record.grade)) out.push({ source: "self-grade", key, detail: record.grade, at: record.lastAt });
  const retrievalKeys = new Set([lessonKey, lessonKey.split("/").at(-1) ?? lessonKey]);
  for (const key of retrievalKeys) {
    const rating = userState.value.retrievalRatings?.[key];
    if (rating && ["again", "hard"].includes(rating.grade)) {
      out.push({ source: "retrieval", key, detail: rating.grade, at: rating.lastAt });
    }
  }
  for (const card of allCards()) if (card.lessonKey === lessonKey && card.lastGrade === "again") out.push({ source: "review", key: card.cardKey, detail: "reviewed again", at: card.lastReviewedAt ?? 0 });
  return out.sort((a, b) => b.at - a.at).slice(0, 8);
}

const prompts: Record<TutorMode, string> = {
  socratic: "Guide with one question at a time. Do not reveal the solution.",
  debugging: "Act as a debugging coach. Ask for observations, invariants and hypotheses before fixes.",
  interview: "Act as a technical interviewer. Ask progressively harder questions.",
  hint: "Give the smallest useful hint. Increase detail only when necessary.",
  "worked-example": "Give a complete worked solution, explaining each important step and decision.",
};

export async function askTutor(input: TutorRequest, model: GradeModel = "claude-haiku-4-5"): Promise<string> {
  const recent = input.recentMistakes ?? (input.lessonKey ? recentMistakes(input.lessonKey) : []);
  const workedExample = input.mode === "worked-example";
  const messages = [...(input.conversation ?? []), { role: "user" as const, content: input.question }]
    .slice(-MAX_TUTOR_MESSAGES);
  const data = await postMessages({
    model,
    max_tokens: 500,
    system: [{ type: "text", text: `You are an AI programming tutor. Respond in ${input.lang === "ru" ? "Russian" : "English"}. The learner has made an attempt or explicitly said they do not know. ${prompts[input.mode]} ${workedExample ? "A complete worked solution is allowed only because the learner explicitly selected Worked example." : "Give the smallest useful hint or one guiding question. Never provide a complete solution."} Lesson: ${input.lessonKey ?? "unknown"}. Concepts: ${input.concepts.join(", ")}. Existing path estimate (context only; do not update or infer mastery): ${JSON.stringify(input.mastery ?? {})}. Recent mistakes (context only, not mastery evidence): ${JSON.stringify(recent)}.`, cache_control: { type: "ephemeral" } }],
    messages,
  }, { fetch: fetch.bind(globalThis), withKey, model });
  return (data?.content?.[0]?.text ?? "").trim();
}
