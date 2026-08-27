import { DatabaseSync } from "node:sqlite";

let db: any;
let dbPath = "";

export function createStore(p: string) {
  dbPath = p;
  db = new DatabaseSync(p);
  db.exec(`CREATE TABLE IF NOT EXISTS todos (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);
  return { db, dbPath };
}

export async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!db) createStore(dbPath || "/tmp/todo-crud-test.db");

  if (path === "/todos" && req.method === "GET") {
    const rows = db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all();
    return Response.json(rows);
  }
  if (path === "/todos" && req.method === "POST") {
    let body: any;
    try { body = await req.json(); } catch { return Response.json({ error: "title: must be valid JSON" }, { status: 400 }); }
    if (!body.title || typeof body.title !== "string" || body.title.trim() === "" || body.title.length > 200) {
      return Response.json({ error: "title: must be non-empty string ≤200" }, { status: 400 });
    }
    // injection-safe parameterized
    db.prepare("INSERT INTO todos (title) VALUES (?)").run(body.title);
    const row = db.prepare("SELECT * FROM todos WHERE id = last_insert_rowid()").get();
    return Response.json(row, { status: 201 });
  }
  const m = path.match(/^\/todos\/(\d+)$/);
  if (m) {
    const id = Number(m[1]);
    if (req.method === "GET") {
      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
      if (!row) return Response.json({ error: `todo ${id} not found` }, { status: 404 });
      return Response.json(row);
    }
    if (req.method === "PATCH") {
      let body: any;
      try { body = await req.json(); } catch { return Response.json({ error: "body: must be valid JSON" }, { status: 400 }); }
      if (body.title !== undefined && (typeof body.title !== "string" || body.title.trim() === "" || body.title.length > 200)) {
        return Response.json({ error: "title: must be non-empty string ≤200" }, { status: 400 });
      }
      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
      if (!row) return Response.json({ error: `todo ${id} not found` }, { status: 404 });
      if (body.title !== undefined) db.prepare("UPDATE todos SET title = ? WHERE id = ?").run(body.title, id);
      if (body.done !== undefined) db.prepare("UPDATE todos SET done = ? WHERE id = ?").run(body.done ? 1 : 0, id);
      const updated = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
      return Response.json(updated);
    }
    if (req.method === "DELETE") {
      const row = db.prepare("SELECT * FROM todos WHERE id = ?").get(id);
      if (!row) return Response.json({ error: `todo ${id} not found` }, { status: 404 });
      db.prepare("DELETE FROM todos WHERE id = ?").run(id);
      return new Response(null, { status: 204 });
    }
  }
  return Response.json({ error: "not found" }, { status: 404 });
}
