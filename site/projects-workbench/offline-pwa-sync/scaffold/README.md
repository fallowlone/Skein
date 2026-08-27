# Offline PWA sync — starter

Implement `src/sync.ts` until the acceptance suite passes:

    bun test

The suite covers the part that actually loses people's data — not the service
worker, but the reconnect:

- **Client-generated mutation ids.** A flush that half-succeeds and gets retried
  must not apply anything twice. Only the client has a stable id at edit time.
- **ACK-gated dequeue.** Dropping the mutation when you send it loses the edit
  every time the response goes missing.
- **Per-note collapse.** Queue the newest body, not every keystroke.
- **LWW with a fixed tiebreak.** Equal timestamps must converge, not flip-flop.
- **Oldest-first application**, so a replayed queue does not leave stale text on top.

Green suite = the sync core is right. Then build the app around it on the project
page: IndexedDB persistence, the service worker (stale-while-revalidate shell,
cache-first assets), Background Sync registration, and a UI that stays honest about
what has not synced yet.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Local-first write queue (IndexedDB)** (`indexeddb-queue`)
2. **Service-worker caching (SWR vs cache-first)** (`service-worker-caching`)
3. **Sync with LWW on reconnect** (`sync-and-conflicts`)
4. **Optimistic UI and sync status** (`optimistic-ui-and-status`)
5. **Observe sync and work an incident** (`observe-and-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

