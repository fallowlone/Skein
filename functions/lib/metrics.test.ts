import { describe, it, expect } from "vitest";
import {
  parseEventsBody,
  parseFeedbackBody,
  tokensEqual,
  MAX_EVENTS_PER_BATCH,
  MAX_SECONDS,
} from "./metrics";

const CID = "11111111-2222-3333-4444-555555555555";

function batch(events: unknown[]): string {
  return JSON.stringify({ clientId: CID, events });
}

describe("parseEventsBody", () => {
  it("accepts a valid mixed batch", () => {
    const r = parseEventsBody(batch([
      { type: "lesson_view", lesson: "react/01-rendering-model/01-component-model", track: "react", lang: "ru" },
      { type: "lesson_time", lesson: "react/01-rendering-model/01-component-model", seconds: 312.7 },
      { type: "practice_result", lesson: "go/01-language-core/02-errors", taskId: "t1", taskType: "blanks", correct: false },
    ]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.clientId).toBe(CID);
    expect(r.events).toHaveLength(3);
    expect(r.events[1]).toEqual({ type: "lesson_time", lesson: "react/01-rendering-model/01-component-model", seconds: 313 });
  });

  it("rejects malformed JSON", () => {
    expect(parseEventsBody("{nope")).toEqual({ ok: false, code: "bad_json" });
  });

  it("rejects missing/invalid clientId", () => {
    expect(parseEventsBody(JSON.stringify({ events: [{ type: "lesson_view", lesson: "a" }] }))).toEqual({ ok: false, code: "bad_shape" });
    expect(parseEventsBody(JSON.stringify({ clientId: "x", events: [{ type: "lesson_view", lesson: "a" }] }))).toEqual({ ok: false, code: "bad_shape" });
  });

  it("rejects empty and oversized batches", () => {
    expect(parseEventsBody(batch([]))).toEqual({ ok: false, code: "bad_shape" });
    const many = Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => ({ type: "lesson_view", lesson: "a" }));
    expect(parseEventsBody(batch(many))).toEqual({ ok: false, code: "too_many" });
  });

  it("rejects unknown event types and bad fields", () => {
    expect(parseEventsBody(batch([{ type: "evil", lesson: "a" }]))).toEqual({ ok: false, code: "bad_event" });
    expect(parseEventsBody(batch([{ type: "lesson_view", lesson: "../etc/passwd" }]))).toEqual({ ok: false, code: "bad_event" });
    expect(parseEventsBody(batch([{ type: "lesson_time", lesson: "a", seconds: -5 }]))).toEqual({ ok: false, code: "bad_event" });
    expect(parseEventsBody(batch([{ type: "lesson_time", lesson: "a", seconds: NaN }]))).toEqual({ ok: false, code: "bad_event" });
    expect(parseEventsBody(batch([{ type: "practice_result", lesson: "a", taskId: "t", taskType: "blanks", correct: "yes" }]))).toEqual({ ok: false, code: "bad_event" });
  });

  it("caps lesson_time at MAX_SECONDS", () => {
    const r = parseEventsBody(batch([{ type: "lesson_time", lesson: "a", seconds: 999999 }]));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.events[0]).toEqual({ type: "lesson_time", lesson: "a", seconds: MAX_SECONDS });
  });
});

describe("parseFeedbackBody", () => {
  it("accepts a valid question and trims it", () => {
    const r = parseFeedbackBody(JSON.stringify({ clientId: CID, lesson: "math/01-counting/01-what-is-number", lang: "ru", text: "  почему ноль не натуральное число?  " }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toBe("почему ноль не натуральное число?");
    expect(r.lang).toBe("ru");
  });

  it("nulls an invalid lang instead of failing", () => {
    const r = parseFeedbackBody(JSON.stringify({ clientId: CID, lesson: "a", lang: "de", text: "q" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lang).toBeNull();
  });

  it("rejects empty and oversized text", () => {
    expect(parseFeedbackBody(JSON.stringify({ clientId: CID, lesson: "a", text: "   " }))).toEqual({ ok: false, code: "bad_shape" });
    expect(parseFeedbackBody(JSON.stringify({ clientId: CID, lesson: "a", text: "x".repeat(2001) }))).toEqual({ ok: false, code: "bad_shape" });
  });

  it("rejects bad lesson slug", () => {
    expect(parseFeedbackBody(JSON.stringify({ clientId: CID, lesson: "<script>", text: "q" }))).toEqual({ ok: false, code: "bad_shape" });
  });
});

describe("tokensEqual", () => {
  it("matches equal tokens and rejects others", () => {
    expect(tokensEqual("secret-token", "secret-token")).toBe(true);
    expect(tokensEqual("secret-token", "secret-tokeN")).toBe(false);
    expect(tokensEqual("short", "longer-token")).toBe(false);
    expect(tokensEqual("", "")).toBe(true);
  });
});
