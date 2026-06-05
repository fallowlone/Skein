import { describe, it, expect, vi } from "vitest";
import {
  parsePracticeCritique,
  buildUserBlock,
  gradableTask,
  gradePracticeWithClient,
  MAX_INPUT_CHARS,
  type GradeDeps,
} from "./practice-grade-llm";
import type { PracticeTaskData } from "~/content.config";

const designTask = {
  id: "d1", type: "design", difficulty: "apply", estMin: 8,
  title: { en: "T", ru: "Т" },
  prompt: { en: "Design a rate limiter", ru: "Спроектируй rate limiter" },
  constraints: { en: "10k rps, single region", ru: "10k rps, один регион" },
  rubric: [
    { en: "picks an algorithm", ru: "выбирает алгоритм" },
    { en: "handles bursts", ru: "обрабатывает всплески" },
  ],
  model: { en: "Token bucket with…", ru: "Token bucket с…" },
} as PracticeTaskData;

const incidentTask = {
  id: "i1", type: "incident", difficulty: "apply", estMin: 10,
  title: { en: "T", ru: "Т" },
  prompt: { en: "p99 spiked", ru: "p99 подскочил" },
  steps: [
    { label: { en: "Triage", ru: "Сортировка" }, prompt: { en: "p1", ru: "п1" }, reveal: { en: "rev1", ru: "рев1" } },
    { label: { en: "Localize", ru: "Локализация" }, prompt: { en: "p2", ru: "п2" }, reveal: { en: "rev2", ru: "рев2" } },
    { label: { en: "Fix", ru: "Фикс" }, prompt: { en: "p3", ru: "п3" }, reveal: { en: "rev3", ru: "рев3" } },
  ],
} as PracticeTaskData;

const diagnoseSelf = {
  id: "g1", type: "diagnose", difficulty: "apply", estMin: 6,
  title: { en: "T", ru: "Т" },
  prompt: { en: "Why does it leak?", ru: "Почему течёт?" },
  evidence: { en: "RSS climbs, heap flat", ru: "RSS растёт, heap плоский" },
  grading: { mode: "self", model: { en: "Off-heap…", ru: "Вне кучи…" }, rubric: [{ en: "names off-heap", ru: "называет вне кучи" }] },
} as PracticeTaskData;

const diagnoseBlanks = {
  id: "g2", type: "diagnose", difficulty: "recall", estMin: 4,
  title: { en: "T", ru: "Т" }, prompt: { en: "p", ru: "п" },
  grading: { mode: "blanks", blanks: [{ id: "b1", accept: ["x"] }] },
} as PracticeTaskData;

const predictTask = {
  id: "p1", type: "predict", difficulty: "recall", estMin: 3,
  title: { en: "T", ru: "Т" }, prompt: { en: "p", ru: "п" },
  scenario: { en: "s", ru: "с" }, reveal: { en: "r", ru: "р" },
} as PracticeTaskData;

const validCritique = {
  verdict: "partial",
  rubricChecks: [{ item: "picks an algorithm", met: true, note: "token bucket" }],
  seniorAdditions: ["clock skew across nodes"],
  missed: { kind: "tradeoff", what: "memory vs accuracy" },
  summary: "Good algorithm choice; misses the distributed-clock tradeoff.",
};

function depsWith(fetchImpl: any): GradeDeps {
  return {
    fetch: fetchImpl,
    withKey: async (fn: (k: string) => Promise<any>) => fn("sk-ant-test"),
    model: "claude-haiku-4-5",
  };
}

const valid = {
  verdict: "partial",
  rubricChecks: [
    { item: "bounds the connection pool", met: true, note: "sized to downstream" },
    { item: "drains the response body", met: false, note: "leaks sockets" },
  ],
  seniorAdditions: ["add a circuit breaker", "alert on pool saturation"],
  missed: { kind: "failure-mode", what: "retry storm under partial outage" },
  summary: "Solid on pooling, misses the drain and the retry-storm failure mode.",
};

describe("parsePracticeCritique", () => {
  it("parses clean JSON into the critique shape", () => {
    expect(parsePracticeCritique(JSON.stringify(valid))).toEqual(valid);
  });

  it("parses JSON wrapped in prose + a ```json fence", () => {
    const wrapped = "Here is my grade:\n```json\n" + JSON.stringify(valid) + "\n```\nHope that helps.";
    expect(parsePracticeCritique(wrapped)).toEqual(valid);
  });

  it("parses JSON wrapped in bare prose (slice braces)", () => {
    expect(parsePracticeCritique("blah " + JSON.stringify(valid) + " trailing")).toEqual(valid);
  });

  it("returns null on non-JSON garbage", () => {
    expect(parsePracticeCritique("not json at all")).toBeNull();
  });

  it("returns null when rubricChecks is missing", () => {
    const { rubricChecks, ...rest } = valid;
    expect(parsePracticeCritique(JSON.stringify(rest))).toBeNull();
  });

  it("returns null when a rubricChecks entry is missing met/item", () => {
    const bad = { ...valid, rubricChecks: [{ item: "x" }] };
    expect(parsePracticeCritique(JSON.stringify(bad))).toBeNull();
  });

  it("returns null on an out-of-set verdict", () => {
    const bad = { ...valid, verdict: "great" };
    expect(parsePracticeCritique(JSON.stringify(bad))).toBeNull();
  });

  it("returns null on an out-of-set missed.kind", () => {
    const bad = { ...valid, missed: { kind: "vibes", what: "x" } };
    expect(parsePracticeCritique(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when seniorAdditions is not a string[]", () => {
    const bad = { ...valid, seniorAdditions: [1, 2] };
    expect(parsePracticeCritique(JSON.stringify(bad))).toBeNull();
  });

  it("returns null when summary is absent", () => {
    const { summary, ...rest } = valid;
    expect(parsePracticeCritique(JSON.stringify(rest))).toBeNull();
  });
});

describe("gradableTask", () => {
  it("is true for design, incident, and self-mode diagnose", () => {
    expect(gradableTask(designTask)).toBe(true);
    expect(gradableTask(incidentTask)).toBe(true);
    expect(gradableTask(diagnoseSelf)).toBe(true);
  });
  it("is false for blanks-mode diagnose, predict, fix, sandbox", () => {
    expect(gradableTask(diagnoseBlanks)).toBe(false);
    expect(gradableTask(predictTask)).toBe(false);
  });
});

describe("buildUserBlock", () => {
  it("maps a design task with constraints, rubric (joined), and model, in the chosen lang", () => {
    const b = buildUserBlock(designTask, "en", "my answer");
    expect(b).toContain("TASK: Design a rate limiter");
    expect(b).toContain("CONSTRAINTS: 10k rps, single region");
    expect(b).toContain("RUBRIC: picks an algorithm; handles bursts");
    expect(b).toContain("MODEL: Token bucket with…");
    expect(b).toContain("LEARNER RESPONSE:\nmy answer");
  });
  it("uses the ru variant when lang is ru", () => {
    const b = buildUserBlock(designTask, "ru", "ответ");
    expect(b).toContain("TASK: Спроектируй rate limiter");
    expect(b).toContain("RUBRIC: выбирает алгоритм; обрабатывает всплески");
  });
  it("builds an incident RUBRIC from step labels and MODEL from joined reveals", () => {
    const b = buildUserBlock(incidentTask, "en", "x");
    expect(b).toContain("RUBRIC: Triage; Localize; Fix");
    expect(b).toContain("rev1");
    expect(b).toContain("rev3");
  });
  it("includes EVIDENCE for a diagnose task that has it", () => {
    expect(buildUserBlock(diagnoseSelf, "en", "x")).toContain("EVIDENCE: RSS climbs, heap flat");
  });
  it("omits EVIDENCE when the diagnose task has none", () => {
    const noEv = { ...(diagnoseSelf as any), evidence: undefined } as PracticeTaskData;
    expect(buildUserBlock(noEv, "en", "x")).not.toContain("EVIDENCE:");
  });
});

describe("gradePracticeWithClient", () => {
  it("sends the key + browser header, caches the senior system prompt, and returns a parsed critique", async () => {
    let sentHeaders: any = {};
    let sentBody: any = {};
    const fetchImpl = vi.fn(async (_url: string, init: any) => {
      sentHeaders = init.headers;
      sentBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ content: [{ type: "text", text: JSON.stringify(validCritique) }] }) };
    });
    const res = await gradePracticeWithClient(designTask, "en", "my answer", depsWith(fetchImpl));
    expect(sentHeaders["x-api-key"]).toBe("sk-ant-test");
    expect(sentHeaders["anthropic-dangerous-direct-browser-access"]).toBe("true");
    expect(sentBody.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(sentBody.system[0].text.toLowerCase()).toContain("senior fullstack");
    expect(res).toEqual(validCritique);
  });

  it("rejects over-long input before calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(
      gradePracticeWithClient(designTask, "en", "x".repeat(MAX_INPUT_CHARS + 1), depsWith(fetchImpl)),
    ).rejects.toThrow(/too long/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects empty/whitespace input before calling the API", async () => {
    const fetchImpl = vi.fn();
    await expect(gradePracticeWithClient(designTask, "en", "   ", depsWith(fetchImpl))).rejects.toThrow(/empty/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws on HTTP failure without leaking the key", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    await expect(gradePracticeWithClient(designTask, "en", "short", depsWith(fetchImpl)))
      .rejects.toThrow(/HTTP 401/);
    await expect(gradePracticeWithClient(designTask, "en", "short", depsWith(fetchImpl)))
      .rejects.not.toThrow(/sk-ant-test/);
  });

  it("throws when the model output cannot be parsed", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ content: [{ type: "text", text: "garbage" }] }) }));
    await expect(gradePracticeWithClient(designTask, "en", "short", depsWith(fetchImpl)))
      .rejects.toThrow(/could not parse/i);
  });
});
