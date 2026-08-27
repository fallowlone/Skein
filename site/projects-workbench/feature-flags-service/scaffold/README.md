# Feature-flag service — starter

Implement `src/flags.ts` until the acceptance suite passes:

    bun test

The suite is the interesting part of this project. It pins down four things that
are easy to get subtly wrong:

- **Kill switch wins.** `enabled: false` is off for everyone, rules included.
- **Bucketing is deterministic and per-flag.** Same user + same flag ⇒ same
  answer in every process; different flags ⇒ different buckets, so experiments
  stay independent.
- **Rollouts are monotonic.** Everyone inside 10% is still inside 20%. Get this
  wrong and raising a rollout revokes the feature from existing users.
- **ETag is content-addressed**, so reordering the array does not bust caches.

Green suite = the core is right. Then build outward on the project page: the
cached HTTP endpoint, the SDK with local evaluation and a background refresh,
audit history, and a staged rollout you can abort mid-flight.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Ruleset model + ETag revalidation** (`ruleset-and-etag`)
2. **Deterministic salted rollout** (`deterministic-rollout`)
3. **Typed SDK with in-process evaluation** (`typed-sdk-evaluation`)
4. **Kill-switch SLO and streaming propagation** (`kill-switch-and-streaming`)
5. **Load-test, observe, and work an incident** (`loadtest-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

