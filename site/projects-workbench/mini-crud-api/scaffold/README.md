# Mini CRUD API — starter

Implement `createStore` and `handle` in `src/api.ts` so the acceptance suite passes.

    bun test

Routes to implement over an in-memory map of `{ id, name }` items:

| Method | Path         | Body     | Success | Error |
|--------|-------------|----------|---------|-------|
| POST   | /items       | `{name}` | 201, item | 400 if no name |
| GET    | /items       | —        | 200, array | — |
| GET    | /items/:id   | —        | 200, item | 404 |
| PUT    | /items/:id   | body     | 200, updated | 404 |
| DELETE | /items/:id   | —        | 200 or 204 | 404 |

Use an incrementing counter (not `Date.now()` or `Math.random()`) so tests stay
deterministic. When the suite is green, read the project page's rubric and push
to the senior bar: validation, error paths, and reasoning about what changes when
the in-memory map becomes a real database.

---

Product milestones — see the project page for the full 5-step product brief:

1. **A server that answers** (`hello-server`)
2. **Route by method and path** (`route-and-respond`)
3. **Read and validate the body** (`read-and-validate-body`)
4. **Make it survive a restart** (`persist-to-sqlite`)
5. **Close the CRUD loop** (`full-crud`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

