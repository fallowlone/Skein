# Threat-model and harden — starter

This workbench grades **your threat model** as a reviewer would: not "is it long",
but "does it close the loop".

1. Write your model in `artifact/threat-model.json`.
2. Run the checks:

       bun test

`src/model.ts` is the grader; you do not edit it. Three failures make a threat model
theatre, and each is an error here:

- **A threat with no control** — a risk you wrote down and left open.
- **A control with no evidence** — "we added helmet" is a claim; a test name, a scan
  output or a log query is proof. Filler like `TODO` / `n/a` counts as absent.
- **A boundary nobody analysed** — then it was decoration, not a boundary.

It also requires all six STRIDE categories (six XSS entries is not a threat model)
and insists the classes behind most real breaches appear somewhere: session
lifetime, object-ownership/IDOR, secrets handling, input validation, transport and
headers.

Green suite = the document is honest. The hardening itself still has to exist — run
ZAP against the app, rotate the credential you found, and confirm each control from
the outside.

---

Product milestones — see the project page for the full 5–6-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Draw the attack tree** (`attack-tree`)
2. **Fix who-you-are and what-you-may-do** (`fix-authn-authz`)
3. **Get secrets out of the code** (`fix-secrets`)
4. **Headers at the edge, validation at the door** (`fix-headers-validation`)
5. **Map every fix to its threat** (`threat-to-fix-writeup`)
6. **Make the pipeline catch regressions** (`ci-security-checks`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

