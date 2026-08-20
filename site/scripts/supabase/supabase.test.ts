import { describe, expect, it } from "vitest";
import {
  loadEnv,
  selectAll,
  makeClient,
  schemaTable,
  CURRICULUM_SCHEMA,
  type AnyTable,
  type TableResult,
} from "./supabase";

/**
 * Fake PostgREST table that enforces a server-side row cap, like Supabase's
 * `max_rows` (default 1000). A single unpaginated `.select()` therefore cannot
 * see the whole table — which is exactly the truncation selectAll must defeat.
 */
function fakeTable(rows: readonly unknown[], serverCap: number): () => AnyTable {
  return () => {
    let from = 0;
    let to = Number.POSITIVE_INFINITY;
    const result = (): TableResult => ({
      data: rows.slice(from, Math.min(to + 1, from + serverCap)),
      error: null,
    });
    const chain = {
      range(f: number, t: number) {
        from = f;
        to = t;
        return Promise.resolve(result());
      },
      then(resolve: (r: TableResult) => unknown) {
        return Promise.resolve(resolve(result()));
      },
    };
    return { select: () => chain } as unknown as AnyTable;
  };
}

describe("selectAll", () => {
  it("pages past the server row cap instead of truncating", async () => {
    const rows = Array.from({ length: 2350 }, (_, i) => ({ id: i }));
    const out = await selectAll(fakeTable(rows, 1000), "id");
    expect(out).toHaveLength(2350);
    expect((out[0] as { id: number }).id).toBe(0);
    expect((out[2349] as { id: number }).id).toBe(2349);
  });

  it("still terminates when the server caps pages below the requested size", async () => {
    const rows = Array.from({ length: 1200 }, (_, i) => ({ id: i }));
    const out = await selectAll(fakeTable(rows, 500), "id", 1000);
    expect(out).toHaveLength(1200);
  });

  it("returns an empty array for an empty table", async () => {
    expect(await selectAll(fakeTable([], 1000), "id")).toEqual([]);
  });

  it("surfaces a PostgREST error instead of returning a short result", async () => {
    const failing = () =>
      ({
        select: () => ({
          range: () => Promise.resolve({ data: null, error: { message: "boom" } }),
          then: (r: (x: TableResult) => unknown) =>
            Promise.resolve(r({ data: null, error: { message: "boom" } })),
        }),
      }) as unknown as AnyTable;
    await expect(selectAll(failing, "id")).rejects.toThrow(/boom/);
  });
});

describe("schemaTable", () => {
  // Regression guard: typing `.schema()` past supabase-js's static schema map
  // must not detach the method from its client, or every call throws.
  it("builds a query on a runtime schema name without losing its receiver", () => {
    const client = makeClient("http://localhost:54321", "test-anon-key");
    const table = schemaTable(client, CURRICULUM_SCHEMA, "lessons");
    expect(typeof table.select).toBe("function");
    expect(() => table.select("slug,content_hash")).not.toThrow();
  });
});

describe("loadEnv", () => {
  // Supabase renamed service_role → "secret key" (sb_secret_...). Accept the
  // new name and the legacy one, so an existing .env.local keeps working.
  it("accepts the current SUPABASE_SECRET_KEY name", () => {
    const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_new" };
    expect(loadEnv(env as never, {})).toEqual({
      url: "https://x.supabase.co",
      key: "sb_secret_new",
    });
  });

  it("still accepts the legacy SUPABASE_SERVICE_ROLE_KEY name", () => {
    const env = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt" };
    expect(loadEnv(env as never, {}).key).toBe("legacy-jwt");
  });

  it("prefers the real environment over site/.env.local", () => {
    const env = { SUPABASE_SECRET_KEY: "from-env" };
    const local = { SUPABASE_SECRET_KEY: "from-file", SUPABASE_URL: "https://file.supabase.co" };
    const out = loadEnv(env as never, local);
    expect(out.key).toBe("from-env");
    expect(out.url).toBe("https://file.supabase.co"); // falls back per-key
  });

  it("reports null rather than an empty string when unset", () => {
    expect(loadEnv({} as never, {})).toEqual({ url: null, key: null });
  });
});
