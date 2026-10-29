# ADR 0003 — hand-rolled input validation, no zod/valibot

Status: accepted.

## Context

M1 needed schema validation on every API boundary with a uniform 422
`{error: code}` matrix. The obvious choice was zod or valibot.

## Decision

Hand-rolled shared validators in `functions/lib/validate.ts`
(`parseX(text) -> {ok} | {ok:false, code}`, HTTP mapping at the route),
consistent with the pre-existing `parseEventsBody` / `parseFeedbackBody` /
`validateSearchParams` style. Syntactic and semantic input failures unify
on 422; 401/403/404/413/429/5xx keep their meanings (`docs/api-routes.md`).

## Consequences

- `functions/` stays dependency-free: the deployed dir must contain no
  `node_modules` or wrangler bundles it and the deploy fails. Any runtime
  dependency — validation or otherwise — is guilty until proven bundlable.
- Validators are small on purpose: the call sites they serve are few and
  stable, so a later zod migration would touch exactly those sites.
- Money-path webhook framing stays 400 (sender retry contracts), not 422 —
  that exception is deliberate, not an oversight.

## Rejected

zod/valibot at the boundary: better errors and less code, but a runtime
dependency in a dir that must ship zero dependencies, for validators small
enough to hold in your head. Revisit if a boundary grows nested/optional
structure that hand-rolled code starts mis-validating — with the failing
matrix test first.
