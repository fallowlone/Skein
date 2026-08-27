# A Next.js app to production — starter

Implement `src/caching.ts` until the acceptance suite passes:

    bun test

No Next.js here: what ships badly is the *policy*, and the policy is testable on its
own.

- **Per-request state forces dynamic.** Reading cookies, headers or searchParams means
  the page belongs to one visitor. Caching it hands that page to the next person — the
  same bug class as a shared session, and silent, because the first visitor sees exactly
  what they expected.
- **Static only when nothing changes without a deploy.** Mutable data with no
  revalidate window must not be cached forever.
- **Stale-while-revalidate.** An expired entry is still served while one caller
  refreshes behind it; blocking everyone the instant the window closes is a stampede at
  the worst possible moment.
- **Tags are the "publish now" path**, independent of the time window.

Green suite = the policy is defensible. Then take the app to production on the project
page: real route segment configs, `revalidateTag` wired to your CMS webhook, a
server/client component boundary that does not leak secrets, and the load test that
proves the cache is doing what you think.

---

Product milestones — see the project page for the full 5–8-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Frame the app: tenancy model, render strategy, SLOs** (`frame`)
2. **Build the RSC + server-action skeleton** (`rsc-skeleton`)
3. **Draw the auth and secret boundaries** (`auth-and-secrets`)
4. **Layer the caches: ISR, CDN, and cache tags** (`caching-layers`)
5. **Decide edge vs node, and hold the asset budget** (`edge-node-and-budgets`)
6. **Build the error hierarchy and wire observability** (`errors-and-observability`)
7. **Deploy it: runtime, pooling, rollout** (`deploy`)
8. **Survive an ISR cache-poisoning incident, then write the post-mortem** (`incident-and-postmortem`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

