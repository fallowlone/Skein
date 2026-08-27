# Presigned upload — starter

Implement `src/presign.ts` until the acceptance suite passes:

    bun test

The suite is about one idea: **a constraint outside the signature is not a
constraint.** It swaps the content type, raises the size cap, redirects the key,
and replays an expired URL — each must fail. It also pins three things people skip:

- Signature comparison is constant-time.
- Receipt is confirmed from the bucket's own metadata (size + ETag), because a
  client saying "done" proves nothing.
- Object keys are derived server-side, so `../../etc/passwd` cannot escape the
  prefix and two uploads of `photo.png` cannot clobber each other.

Green suite = the security core is right. Then wire the real flow on the project
page: the issuing endpoint, bucket CORS so the browser PUTs directly, and the
confirm step that never proxies file bytes.

---

Product milestones — see the project page for the full 5-step product brief:

1. **Issue a constrained presigned PUT** (`presigned-put`)
2. **CORS direct upload without proxy** (`cors-and-direct-upload`)
3. **Server-assigned keys and clobber prevention** (`server-keys-and-clobber`)
4. **Completion webhook with ETag verification** (`completion-webhook-verification`)
5. **Load-test, observe, and work an incident** (`loadtest-observe-incident`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

