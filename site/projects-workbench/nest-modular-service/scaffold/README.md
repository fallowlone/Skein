# Production-shaped Nest service — starter

Implement `src/pipeline.ts` until the acceptance suite passes:

    bun test

There is no Nest here on purpose. What the suite tests is the semantics the framework
provides, which is the part that bites in review:

- **Guards before pipes.** An unauthenticated caller must never reach validation. The
  other order means you parse and validate attacker-supplied bodies — CPU spent on
  traffic you are about to reject, and your validator's surface exposed to it.
- **Declaration order, short-circuited.** The cheapest, most fundamental check ("is
  there a session at all") runs first and stops the rest.
- **Interceptors straddle the handler**, outermost first, so a logging interceptor
  observes a guard rejection only when it sits outside the guard.
- **Rejection is a status**, not an exception escaping to the client.
- **Scope bubbling.** A request-scoped provider injected into a singleton is resolved
  once and frozen — the first request's tenant then leaks to every request after it.
  Depending on something narrower must widen your own scope, and a circular dependency
  is an error rather than a hang.

Green suite = the model is right. Then build the service on the project page: real
modules and DI, DTO validation, guards and interceptors wired both globally and
per-route, an exception filter, and the config module with typed environment access.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Carve the modules** (`modules-and-boundaries`)
2. **Validate at the edge** (`validate-at-the-edge`)
3. **Own the cross-cutting concerns** (`guards-and-interceptors`)
4. **Configuration you can't typo** (`typed-config`)
5. **Boot the whole thing in tests** (`e2e-suite`)
6. **Senior stretch: a queue and a log you can trust** (`queue-and-logs`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

