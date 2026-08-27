# URL Shortener at Scale — starter

Implement `encodeBase62`, `decodeBase62`, and `Shortener` in `src/shortener.ts`
so the acceptance suite passes.

    bun test

Rules: counter-based unique codes (no `Math.random` / `Date.now`), inject
the clock via the `now` parameter. The suite checks base62 round-trips, create
+ resolve, unknown code, TTL expiry, redirect policy, and 100-code uniqueness.
When it is green, read the project page's rubric and push to the senior bar
(cache-stampede dampening, 301 permanence tradeoffs, hot-code coordination).

---

Product milestones — see the project page for the full 5–8-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Frame the system: scale, SLOs, non-goals** (`frame`)
2. **Design the API, the schema, and the short code** (`design`)
3. **Build the redirect hot path** (`build-core`)
4. **Cache the reads, protect the writes** (`cache-and-protect`)
5. **Test it: unit, integration, contract, load** (`test`)
6. **Deploy it: container, pipeline, rollout** (`deploy`)
7. **Observe it: RED, traces, SLOs** (`observe`)
8. **Survive a cache stampede, then write the post-mortem** (`incident-and-postmortem`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

