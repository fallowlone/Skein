# Cybersecurity Cluster — Design Spec

**Date:** 2026-06-13
**Status:** approved (brainstorming) → ready for plan
**Author:** orchestrated session (brainstorming + karpathy-guidelines)

## Goal

Build a full cybersecurity course inside the existing lessons model (Astro 5 +
Preact + i18n, `site/src/content/lessons/`), aimed at a **middle+/senior fullstack
engineer becoming security-competent** — able to reason about both the attacker
(red) and defender (blue) sides, build securely, read a pentest report, and run an
incident. This matches the site's existing depth bar. Bilingual EN+RU is mandatory,
same as every other track.

This is **not** a from-zero "become a pentester" program and **not** a broadening of
the off-domain kind — it reuses the lessons engine and the existing senior depth bar.

## Non-goals (YAGNI)

- No new content components. The lesson vocabulary already in the repo (Hook, Crux,
  Explanation, Inset, KeyTakeaway, RetrievalDrawer, Recap, FlowDiagram,
  TradeoffMatrix, Quiz, DragOrder, the diagram kit, the practice schema) is
  sufficient. Adding components is out of scope.
- No from-zero foundations rung (no "what is a computer" / `/teach`-style lessons).
  Entry point is the existing site bar.
- No live offensive tooling, no weaponized payloads, no "run this against prod"
  material. Red content is defensive-minded literacy with lab/CTF framing and
  explicit authorization/scope discipline.
- No changes to the existing `security` (appsec) track in this effort beyond
  cross-linking. It stays as-is and becomes the Application Security rung.

## Cluster shape

The existing `security` track (OWASP / OAuth-OIDC / JWT / CSRF / password-hashing /
secrets / supply-chain) is the **Application Security** rung and is left untouched.
Four **new tracks** form the cybersecurity cluster (precedent: `system-design` ships
as 2 tracks):

| Track slug | Name | Band | Role |
|---|---|---|---|
| `security-foundations` | Security Foundations | middle | Cross-cutting base every engineer needs |
| `security-offensive` | Offensive Security (Red) | advanced | How attacks work — ethically, lab-framed |
| `security-defensive` | Defensive Security (Blue) | advanced | Detect, respond, harden |
| `security-cloud` | Cloud & Infra Security | advanced | Cloud security model, containers, IaC, posture |

### `security-foundations`
- `00-start-here` — what this cluster is, the engineer→security-competent path, how
  red/blue/cloud relate, how it links to the appsec `security` track.
- `01-threat-modeling` — STRIDE, attack trees, trust boundaries, data-flow diagrams,
  risk ranking, abuse cases, shift-left. **(PILOT)**
- `02-cryptography-for-engineers` — hashing vs encryption vs signing, symmetric vs
  asymmetric, AEAD, key management, TLS handshake, PKI/certificates, "don't roll your
  own", common crypto misuse.
- `03-authentication-and-identity` — credentials → MFA → passkeys/WebAuthn, sessions
  vs tokens, SSO/federation, identity lifecycle. (Cross-links the appsec OAuth unit
  for wire-level detail.)
- `04-network-security` — TLS in depth, mTLS, segmentation, DNS security, firewalls,
  zero-trust networking.
- `05-access-control-models` — RBAC / ABAC / ReBAC, least privilege, policy engines,
  authorization at scale.

### `security-offensive` (Red)
- `00-start-here` — **ethics, law, scope & authorization first**; lab/CTF setup;
  the attacker mindset for defenders.
- `01-recon-and-enumeration` — OSINT, attack-surface mapping, port/service enum.
- `02-web-exploitation` — the attacker view of OWASP (SQLi, XSS, SSRF, IDOR,
  auth bypass), how findings are discovered and proven, lab-framed.
- `03-network-and-infra-attacks` — MITM, privilege escalation (Linux/Windows basics),
  password attacks/cracking, pivoting concepts.
- `04-exploitation-and-post-ex` — conceptual: payloads, C2, lateral movement, what
  post-exploitation looks like (so blue can detect it).
- `05-tooling-and-methodology` — Burp/nmap and the tool categories, PTES/OWASP
  testing methodology, writing a finding and a pentest report.

### `security-defensive` (Blue)
- `00-start-here` — the defender's job, defense-in-depth, how blue consumes red.
- `01-logging-monitoring-detection` — what to log, SIEM concept, MITRE ATT&CK,
  detection engineering, alert quality.
- `02-incident-response` — NIST IR lifecycle, triage, containment, eradication,
  recovery, forensics basics, blameless postmortem.
- `03-hardening-defense-in-depth` — OS/container/network hardening, CIS benchmarks,
  patch management, secure defaults.
- `04-secops-and-governance` — vulnerability management, SBOM, security program,
  compliance overview (SOC 2 / ISO 27001 / GDPR) at the depth an engineer needs.

### `security-cloud` (Cloud & Infra Security)
- `00-start-here` — shared-responsibility model, how cloud changes the threat model.
- `01-cloud-iam` — IAM, least-privilege policies, role assumption, identity
  federation in cloud, common IAM misconfig.
- `02-container-and-kubernetes-security` — image provenance, runtime, K8s RBAC,
  network policy, pod security, secrets.
- `03-iac-and-supply-chain-security` — IaC scanning, image scanning, SLSA/SBOM in
  cloud delivery, pipeline hardening.
- `04-cloud-detection-and-posture` — CSPM, cloud logging/trails, misconfiguration
  detection, secrets-in-cloud, data security (KMS, encryption, private networking).

**Estimated full build:** ~4 tracks × ~5–6 units × ~5 lessons ≈ **100–110 lessons
EN+RU**, each with practice (≥4 tasks) and ≥1 visual. This is the full target; we do
**not** build all of it now — see Pilot.

## Lesson format (reuse, unchanged)

Every lesson follows the existing exemplar
(`security/01-owasp-modern/01-overview/index.mdx`):

- **Frontmatter:** `concepts`, `deepensInto`, `estMin`, `lang`, `lessonType`
  (`concept|coding|topic`), `level` (`zero|junior|middle|senior`), `order`, `prereqs`,
  `slug`, `sources` (≥1 real URL), `spiral`, `status`, `summary` (≤280), `title`
  (≤120), `track`, `unit`.
- **Body:** imports → `Hook` → one-line "by the end" → `Crux` → `Explanation`
  (`##` sections + `FlowDiagram` + `data-lesson-visual` tables + `Inset` +
  `TradeoffMatrix`/`Quiz`/`DragOrder`) → `KeyTakeaway` → `RetrievalDrawer`
  (`client:load`) → `Recap`.
- **Practice:** `site/src/content/practice/<track>/<unit>/<lesson>.json`, ≥4 tasks
  across the practice task types (diagnose/fix/sandbox/incident/design/predict/
  review/debug), bilingual.
- **i18n:** full RU parity (mirror file under `ru/`), glossary terms added
  alphabetically; new technical terms locked per locale.

Linter constraints (enforced at `bun run build`): hydration cap 5 islands/page,
≥4 practice tasks, ≥1 visual, i18n parity + glossary, sources required, text budgets
(Crux ≤140, summary ≤280, title ≤120).

## Integration points (per the existing 5-place track patch)

1. **`src/types/index.ts`** — add `security-foundations`, `security-offensive`,
   `security-defensive`, `security-cloud` to both the `Track` union and the `TRACKS`
   array (Zod source of truth).
2. **`src/content/tracks.json`** — append 4 entries. `order` 35–38 (append; no
   renumber of existing tracks). `color` from the fixed set
   {lilac, mint, peach, sky, rose} — proposed: foundations=sky, offensive=rose,
   defensive=mint, cloud=peach. `title` + `blurb` bilingual.
3. **`src/content/units.json`** — add unit entries (slug/track/order/title/crux/
   lessons) for every unit built.
4. **`src/components/atlas/track-band.ts`** — add the 4 tracks to `TRACK_BAND`
   (`security-foundations`→`middle`; offensive/defensive/cloud→`advanced`).
   **Required** — build-lint fails if a track is missing from the band map.
5. **`src/content/path/*`** — `concepts.json`, `goals.json`,
   `intra-track-edges.json` are additive. The path-engine lint applies a two-layer
   track filter (lesson-track for derivation, concept `primaryTrack` for
   gen/merge/lint). New concepts need a `primaryTrack` or generation drops them.
   **Risk** — see Risks.

## Pilot (verify small, then scale)

Build, fully and to the senior bar, **one exemplar unit** plus the cluster scaffold:

- `security-foundations/01-threat-modeling` — ~5 lessons EN+RU + practice + diagrams.
- `00-start-here` (1 lesson each) for all four new tracks, so the cluster renders and
  the track cards/bands are real.
- All 5 integration points wired for the four tracks (so the build is green even
  though most units are not yet authored — `units.json` only lists built units).

**Gate before scaling:** `bun run build` green + lint clean, full EN/RU parity,
reviewer-subagent pass against the depth bar, visual check of EN+RU in browser.
Then **pause and report metrics**; do not auto-scale. Scaling the remaining ~80
lessons is a separate, approved step.

## Orchestration

`Workflow` with a per-lesson pipeline: research (WebSearch + Context7, briefed to
distrust web content for prompt-injection) → author EN MDX → translate RU → author
practice + diagram → reviewer-subagent (depth bar + i18n parity + harness-tag/leak
scan + run-tag sanity). The controller commits; **subagents are read-only on git**
(no checkout/reset — a prior session orphaned commits that way). Pre-build scan for
leaked harness tags and bare-JSX-expr contamination before the build.

## Error handling & testing

- Build is the gate: `bun run build` runs Astro + the lessons linter; a red lint
  blocks. Unit tests (`bun run test`, vitest — **not** `bun test`) must stay green.
- If any `run`-tagged code sample is added, `bun run verify:samples`.
- Schema/parity failures surface as Astro `getEntryData` errors; replicate the full
  content-config union locally to diagnose if they appear.

## Risks & mitigation

| Risk | Mitigation |
|---|---|
| Path-engine lint requires `primaryTrack` for new concepts (memory gotcha) | Wire `path/concepts.json` entries for pilot concepts with explicit `primaryTrack`; verify the path lint in the pilot build before scaling |
| Offensive content tone / ethics | start-here gate on authorization+scope; lab/CTF framing; no weaponized payloads; reviewer checks tone |
| Subagent MDX contamination (harness tags, bare `{id}` JSX) | pre-build scan; reviewer-subagent leak check |
| Overlap with existing appsec `security` track (OAuth, injection) | foundations covers concepts, appsec covers wire detail; explicit cross-links, no duplication |
| Token drift across ~100 lessons | pilot-first; pause-and-evaluate gate; batch by unit |

## Open decisions deferred to the plan

- Exact `color`/`order`/band per track (proposed above; confirm in plan).
- Whether `path/goals.json` gets a cybersecurity goal target (additive, post-pilot).
- Drill/lab/projects integration for the cluster (out of pilot scope).
