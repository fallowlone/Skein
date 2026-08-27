# Type-Safe SDK — starter

Implement the primitives in `src/sdk.ts` so the acceptance suite passes.

    bun test

Rules: all I/O and timing must be **injected** — no real `fetch`, no real
`setTimeout`. The suite tests `parse` (throws `ValidationError` on schema
failure), `backoffDelays` (pure exponential: `[baseMs, baseMs*2, ...]`),
`withRetry` (injected `sleep`, exact retry count), `defineClient.get` (delegates
to injected `fetchImpl`, parses on 200, throws `HttpError` on 4xx/5xx).

When green, read the project page rubric and push to the senior bar.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Model the domain, not the JSON** (`model-the-domain`)
2. **A generic request core** (`generic-request-core`)
3. **Validate at the boundary** (`validate-the-boundary`)
4. **Return results, don't throw** (`typed-results`)
5. **Generate types from the schema** (`codegen-from-schema`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

