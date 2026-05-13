---
description: Verify a curriculum piece (EN + RU) against sources, completeness, i18n parity, hydration cap. Use after authoring.
argument-hint: <pillar>/<NN-piece>
allowed-tools: Agent
---

# /verify-piece — automated piece QA

**Input:** `$ARGUMENTS` — piece slug, e.g. `networking/03-tcp-handshake`.

**Behavior:**

1. Validate `$ARGUMENTS` matches `<pillar>/<NN-piece>` form. Refuse if not.
2. Confirm `site/src/content/book/en/$ARGUMENTS/index.mdx` exists. Refuse if missing.
3. Dispatch the `verify-piece` subagent with the slug:

   ```
   Agent({
     subagent_type: "verify-piece",
     description: "Verify piece <slug>",
     prompt: "Verify piece: <slug>. Run all 7 check categories per the subagent spec. Write report to site/dist/verify-reports/<slug-flat>.md. Print summary."
   })
   ```

4. After subagent completes, print:
   - Path to full report file
   - Summary counts (✓/⚠/✗/?)
   - First 5 ✗ findings (if any)
   - Suggested next action: "fix listed errors, then re-run /verify-piece" or "ok to commit"

**Hard rules:**

- Never invoke fact-corrections directly. This command is read-only verification. User decides to fix.
- Never write to MDX files. Only to `site/dist/verify-reports/`.
- If `site/dist/` is missing, instruct user to run `bun run build` first.
