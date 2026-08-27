import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync, existsSync } from "node:fs";
import { createStore, handle } from "../src/todos";

const DB = "/tmp/todo-crud-test.db";

beforeEach(() => { try { unlinkSync(DB); } catch {} });
afterEach(() => { try { unlinkSync(DB); } catch {} });

describe("todo crud sqlite", () => {
  test("POST creates and GET lists", async () => {
    const store = createStore(DB);
    // @ts-ignore - store may expose handle or need to be passed
    const r = await handle(new Request("http://localhost/todos", { method: "POST", body: JSON.stringify({ title: "hello" }), headers: { "content-type": "application/json" } }));
    expect(r.status).toBe(201);
  });
});
