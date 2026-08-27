# React feature at scale — starter

Implement `src/store.ts` until the acceptance suite passes:

    bun test

There is no React in this suite, on purpose: the problems that make a large feature
slow and stale are data-shape problems that merely show up as rendering problems.

- **Normalisation.** One copy per id, referenced by id everywhere else. A nested
  response duplicated across three screens is why only one of them updates.
- **Memoised selectors.** A filtered array recomputed each render is a new reference
  each render, so a memoised child re-renders although nothing it cares about changed.
  The suite asserts reference stability and counts recomputations.
- **Optimistic updates with a real rollback.** Undo from a snapshot, because
  re-applying the inverse edit is wrong as soon as a second mutation lands in between.
  Settle the pending entry on commit, and ignore a failure that arrives after the user
  has changed the value again.
- **No mutation.** A store that mutates in place defeats every reference-equality check
  React makes.

Green suite = the state layer is sound. Then build the feature on the project page:
data fetching with a cache, list virtualisation, code splitting at the route, and the
render-profiling pass that proves the memoisation actually pays for itself.

---

Product milestones — see the project page for the full 5–8-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Frame the feature: surface, budgets, non-goals** (`frame`)
2. **Design state ownership: server, client, and the boundary** (`state-ownership`)
3. **Build the RSC shell, islands, and the live update path** (`build-shell-and-live`)
4. **Add optimistic mutations with honest rollback** (`optimistic-mutations`)
5. **Test the async surface and virtualize the feed** (`test-and-virtualize`)
6. **Make it accessible: semantics, focus, live regions** (`accessibility`)
7. **Deploy it and watch the field: RUM, web vitals, budgets** (`deploy-and-observe`)
8. **Survive a re-render storm, then write the post-mortem** (`incident-and-postmortem`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

