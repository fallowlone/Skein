import { describe, it, expect } from "vitest";
import { onRequestGet } from "./summary";
import { FakeKV } from "../../test/fakes";

const views = [
  { lesson: "a/01/x", track: "a", views: 10, uniq: 7 },
  { lesson: "a/02/y", track: "a", views: 5, uniq: 5 },
  { lesson: "b/01/z", track: "b", views: 1, uniq: 1 },
];
const times = [{ lesson: "a/01/x", avg_seconds: 61.4, samples: 3 }];
const practice = [{ lesson: "a/01/x", attempts: 4, correct_ratio: 0.5 }];
const feedback = [
  { id: 2, ts: 200, lesson: "a/02/y", lang: "ru", text: "second" },
  { id: 1, ts: 100, lesson: "a/01/x", lang: "en", text: "first" },
];

/** Minimal stub serving the summary's four aggregate queries. */
function stubDb(seen: string[] = []) {
  const pick = (sql: string) => {
    if (sql.includes("type = 'lesson_view'")) return views;
    if (sql.includes("type = 'lesson_time'")) return times;
    if (sql.includes("type = 'practice_result'")) return practice;
    if (sql.includes("FROM feedback")) return feedback;
    throw new Error(`unexpected SQL: ${sql}`);
  };
  return {
    prepare: (sql: string) => {
      seen.push(sql);
      const rows = pick(sql);
      const stmt = {
        bind: (...args: unknown[]) => {
          // Only the feedback query takes a bound LIMIT.
          if (sql.includes("FROM feedback")) return { all: async () => ({ results: rows.slice(0, args[0] as number) }) };
          return { all: async () => ({ results: rows }) };
        },
        all: async () => ({ results: rows }),
      };
      return stmt;
    },
  };
}

const TOKEN = "opaque-admin-token";
const ctx = (url: string, db: unknown = stubDb()) => ({
  request: new Request(url, {
    headers: { "CF-Connecting-IP": "9.9.9.9", Authorization: `Bearer ${TOKEN}` },
  }),
  env: { SESSIONS: new FakeKV(), DB: db, ADMIN_TOKEN: TOKEN } as any,
  data: {},
}) as any;

const ctxNoToken = (url: string) => ({
  request: new Request(url, { headers: { "CF-Connecting-IP": "9.9.9.9" } }),
  env: { SESSIONS: new FakeKV(), DB: stubDb(), ADMIN_TOKEN: TOKEN } as any,
  data: {},
}) as any;

describe("GET /api/admin/summary", () => {
  it("401s without a bearer token and 503s without ADMIN_TOKEN", async () => {
    expect((await onRequestGet(ctxNoToken("https://x/api/admin/summary"))).status).toBe(401);
    const noSecret = {
      request: new Request("https://x/api/admin/summary", {
        headers: { "CF-Connecting-IP": "9.9.9.9", Authorization: "Bearer x" },
      }),
      env: { SESSIONS: new FakeKV(), DB: stubDb() } as any,
      data: {},
    } as any;
    expect((await onRequestGet(noSecret)).status).toBe(503);
  });

  it("paginates the merged lesson list with totals", async () => {
    const p1 = await (await onRequestGet(ctx("https://x/api/admin/summary?per_page=2"))).json() as any;
    expect(p1.lessons).toHaveLength(2);
    expect(p1.lessons[0].lesson).toBe("a/01/x");
    expect(p1.totalLessons).toBe(3);
    expect(p1.page).toBe(1);
    expect(p1.per_page).toBe(2);

    const p2 = await (await onRequestGet(ctx("https://x/api/admin/summary?per_page=2&page=2"))).json() as any;
    expect(p2.lessons).toHaveLength(1);
    expect(p2.lessons[0].lesson).toBe("b/01/z");
  });

  it("422s out-of-range pagination params", async () => {
    for (const qs of ["page=0", "page=abc", "per_page=0", "per_page=101", "questions_limit=0", "questions_limit=101"]) {
      const res = await onRequestGet(ctx(`https://x/api/admin/summary?${qs}`));
      expect(res.status).toBe(422);
    }
  });

  it("bounds the aggregates with an optional since timestamp", async () => {
    const seen: string[] = [];
    const withBind: string[] = [];
    const db = {
      prepare: (sql: string) => {
        seen.push(sql);
        return {
          bind: (...args: unknown[]) => {
            withBind.push(`${sql} :: ${JSON.stringify(args)}`);
            return { all: async () => ({ results: [] }) };
          },
          all: async () => ({ results: [] }),
        };
      },
    };
    const body = await (await onRequestGet(ctx("https://x/api/admin/summary?since=1700000000000", db))).json() as any;
    expect(body.totalLessons).toBe(0);
    const aggregates = seen.filter((s) => s.includes("GROUP BY lesson"));
    expect(aggregates).toHaveLength(3);
    for (const sql of aggregates) expect(sql).toContain("ts >= ?");
    expect(withBind.filter((s) => s.includes("1700000000000"))).toHaveLength(3);
  });

  it("422s a non-numeric since", async () => {
    const res = await onRequestGet(ctx("https://x/api/admin/summary?since=last-week"));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "bad_since" });
  });

  it("bounds the feedback query with questions_limit", async () => {
    const seen: string[] = [];
    const body = await (await onRequestGet(
      ctx("https://x/api/admin/summary?questions_limit=1", stubDb(seen)),
    )).json() as any;
    expect(body.questions).toHaveLength(1);
    expect(body.questions[0].id).toBe(2);
    expect(seen.some((s) => s.includes("FROM feedback") && s.includes("LIMIT ?"))).toBe(true);
  });
});
