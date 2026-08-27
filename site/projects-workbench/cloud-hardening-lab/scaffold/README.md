# Cloud hardening lab — starter

This workbench grades **your before/after report**, so the review needs no access to
your account.

1. Scan your own account with an open-source CSPM (Prowler, ScoutSuite), harden it,
   scan again.
2. Record both halves and what you did in `artifact/posture.json`.
3. Run the checks:

       bun test

`src/posture.ts` is the grader; you do not edit it. What ships in `artifact/` is the
report you have *before* doing the work: no baseline, no timestamps, nothing fixed.

The suite enforces the rules that separate hardening from a screenshot:

- **A baseline exists**, with the tool that produced it and a timestamp. "I think it's
  fine" is not a baseline.
- **Every critical/high finding is fixed with evidence, or accepted with a reason and
  an owner.** `open` is the one status that fails, and `TODO`/`n/a` counts as no
  evidence at all. Medium and low may stay open.
- **The after scan introduces no new severe findings** — hardening that breaks
  something else is not hardening.
- **The four controls are done and provable**: least-privilege IAM (no wildcards
  left), closed network paths (nothing sensitive on 0.0.0.0/0), secrets in a managed
  store (zero plaintext remaining), and an account-wide audit trail.

Green suite = the report is honest and complete. It cannot verify your account —
only that you measured, changed something specific, and can prove it.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Measure what you actually have** (`baseline-posture`)
2. **Scope IAM to least privilege** (`tighten-iam`)
3. **Close the open paths** (`network-lockdown`)
4. **Get secrets out of plaintext** (`secrets-and-kms`)
5. **Make the account auditable** (`audit-logging`)
6. **Stop the next misconfiguration before it ships** (`policy-as-code`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

