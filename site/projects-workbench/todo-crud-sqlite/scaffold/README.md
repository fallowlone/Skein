# Todo CRUD with SQLite — starter

Implement the todos API in `src/todos.ts` so the acceptance suite passes.

    bun test

Routes over SQLite file `todos.db` (auto-migrated):

| Method | Path | Body | Success | Error |
|--------|------|------|---------|-------|
| POST | /todos | `{title}` | 201, todo | 400 if missing/empty |
| GET | /todos | — | 200, todos | — |
| GET | /todos/:id | — | 200, todo | 404 |
| PATCH | /todos/:id | `{title?, done?}` | 200, updated | 400/404 |
| DELETE | /todos/:id | — | 204 | 404 |

Use parameterized queries (`?` placeholders). The DB file must survive a restart — not `:memory:`.
Delete `todos.db`, restart, GET /todos should be 200 with [].

The store exports `createStore(dbPath)` and `handle(req)` — see `src/todos.ts` for the stub.
