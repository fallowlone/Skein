# Integrated Capstone "URL shortener at scale" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author one bilingual guided-project JSON — `site/src/content/projects/url-shortener-at-scale.json` — that carries a URL shortener through the full senior lifecycle (idea → … → post-mortem), weaving the spine tracks via `feedsFrom`, validated by the build + capstones lint.

**Architecture:** Pure content authoring on the existing `projects` framework (`ProjectSchema` in `src/content.config.ts`; rendered by `CapstonePath.tsx` + `[lang]/projects/[slug].astro`; tracked by `capstone-state.ts`). The glob loader auto-registers the file; no code, components, routes, or schema change.

**Tech Stack:** Astro content collection (Zod `ProjectSchema`), JSON, bun. Validation: `cd site && bun run build`. Branch `feat/capstone-url-shortener` (off `main`, which has campaign A+B+C merged).

**Hard constraints (from `src/lint/rules/capstones.ts`):**
- Every guided-milestone `{en, ru}` pair must be non-empty, and for prose ≥25 chars `en !== ru` (real translation — no mirrored RU).
- Every `feedsFrom` entry must match `^[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+$` (3-part `track/unit/lesson`) with a **real track** as the first segment.
- `ProjectSchema`: `milestones` ≥ 2; `seniorStretch` ≥ 1; `skills` ≥ 1; `tracks` ≥ 1 (valid `Track`s); `estDays` positive int; `category ∈ {frontend,backend,fullstack,infra}`; `difficulty ∈ {starter,intermediate,advanced}`.

---

## File structure
- Create: `site/src/content/projects/url-shortener-at-scale.json` (the only deliverable).

---

## Task 1: Resolve template + feedsFrom keys

**Files:** none (research).

- [ ] **Step 1: Read a guided-project template**

Run: `cat site/src/content/projects/rate-limiter.json` (also `oauth-mini.json`). Note the exact
field order and the `GuidedMilestone` shape (`id`, `title`, `goal`, `definitionOfDone[]`,
`feedsFrom[]`, optional `reviewPrompt`), and how `pitch`/`deliverable`/`brief`/`skills`/`stack`
are written.

- [ ] **Step 2: Lock the feedsFrom key list (real keys, verified)**

These are real lesson keys (resolved from `scripts/depth-audit/grades.json`); use per milestone:
- frame → `system-design/01-scalability/03-back-of-envelope`, `apis/01-rest-modeling/01-overview`
- design → `databases/01-relational-model/02-constraints-and-keys`, `databases/02-indexes/01-index-anatomy`, `apis/01-rest-modeling/01-overview`, `caching/01-layers/01-overview`, `system-design/01-scalability/01-latency-vs-throughput`
- build-core → `databases/02-indexes/02-leading-column-rule`, `backend/01-request-lifecycle/01-overview`, `backend/01-request-lifecycle/03-routing-and-middleware`
- cache-and-protect → `caching/01-layers/01-overview`, `caching/03-stampede/02-lock-and-single-flight`, `backend/02-middleware-di/02-writing-middleware`
- test → `engineering-practice/01-tdd-property/01-rgr-design-loop`, `engineering-practice/02-contract-testing/01-overview`, `ci-cd/02-testing-in-ci/01-test-pyramid-and-gates`
- deploy → `deployment/01-image-layers/01-overview`, `deployment/03-k8s-objects/01-overview`, `deployment/06-lb-levels/01-overview`
- observe → `observability/02-structured-logging/01-why-structured-logs`, `observability/04-red-use/01-red-and-use-overview`, `observability/06-trace-propagation/01-what-is-propagation`
- incident-and-postmortem → `caching/03-stampede/01-what-is-stampede`, `caching/07-dogpile/01-overview`, `performance/02-hot-paths/01-what-makes-a-hot-path`, `engineering-practice/06-postmortems/01-overview`

If any milestone wants a security `feedsFrom` (rate-limit/secrets), resolve a real key first:
`node -e "const g=require('./scripts/depth-audit/grades.json'); console.log(g.flatMap(u=>u.grades.map(l=>l.lessonKey)).filter(k=>k.startsWith('security/')&&!/\/(quiz-|project|drill)$/.test(k)).join('\n'))"`
(use one that exists, e.g. an `owasp`/`secrets` lesson) — only add it if a real key exists; otherwise omit it (feedsFrom is optional per milestone).

- [ ] **Step 3:** No commit (research only).

---

## Task 2: Author the EN project (full structure + 8 milestones)

**Files:** Create `site/src/content/projects/url-shortener-at-scale.json`

Write the complete JSON. Top-level fields:
```jsonc
{
  "slug": "url-shortener-at-scale",
  "title": { "en": "URL shortener at scale", "ru": "<RU in Task 3>" },
  "pitch": { "en": "Build a URL shortener that survives real traffic — then run it: deploy it, watch it, and work the incident when a hot link melts your cache.", "ru": "" },
  "deliverable": { "en": "A deployed redirect service with an indexed store, a read-through cache, a CI/CD pipeline, RED dashboards + SLOs, and a written post-mortem of a cache-stampede incident.", "ru": "" },
  "category": "fullstack",
  "difficulty": "advanced",
  "estDays": 10,
  "tracks": ["system-design","apis","databases","backend","caching","security","engineering-practice","ci-cd","deployment","observability","performance"],
  "skills": ["api design","schema + indexing","caching strategy","load testing","CI/CD","containers + k8s","observability (RED/SLO)","incident response","post-mortems"],
  "stack": ["Postgres","Redis","a reverse proxy/CDN","your backend language","a container runtime","an OTel-compatible tracer"],
  "brief": { "en": "<2-3 sentence framing of the build, see spec §1>", "ru": "" },
  "milestones": [ /* 8 GuidedMilestones below */ ],
  "seniorStretch": [
    { "en": "Go multi-region: serve redirects read-local and reason about the create-path consistency trade-off.", "ru": "" },
    { "en": "Add a click-analytics pipeline (events → queue → rollups) that never slows the redirect path.", "ru": "" },
    { "en": "Support custom domains with automated TLS issuance and per-tenant isolation.", "ru": "" },
    { "en": "Detect and throttle abusive create/redirect patterns without hurting legitimate bursts.", "ru": "" }
  ]
}
```

Each milestone follows this **exemplar** (write all 8 at this depth — name the mechanism, the
trade-off, and the failure mode; the `definitionOfDone` is a real self-check, not a to-do):

```jsonc
{
  "id": "incident-and-postmortem",
  "title": { "en": "Survive a cache stampede, then write the post-mortem", "ru": "" },
  "goal": {
    "en": "A popular link's cache entry expires under peak traffic; thousands of concurrent misses hit Postgres at once, p99 redirect latency spikes and the origin saturates. Detect it from your own metrics, mitigate it live, find the root cause, and write the post-mortem. The mechanism that saves you is request coalescing (single-flight) plus a probabilistic early refresh — not just a longer TTL, which only moves the cliff.",
    "ru": ""
  },
  "definitionOfDone": [
    { "en": "You reproduced the stampede with a load test (N concurrent misses on one hot key) and captured the p99 spike and origin QPS on your dashboard.", "ru": "" },
    { "en": "You mitigated it with single-flight (one origin fetch per key) and an early-refresh jitter, and showed the p99 returning to SLO.", "ru": "" },
    { "en": "Your post-mortem states the trigger, the contributing factors, the blast radius, the fix, and one prevention that is not 'raise the TTL'.", "ru": "" }
  ],
  "feedsFrom": ["caching/03-stampede/01-what-is-stampede","caching/07-dogpile/01-overview","performance/02-hot-paths/01-what-makes-a-hot-path","engineering-practice/06-postmortems/01-overview"],
  "reviewPrompt": { "en": "Paste your post-mortem's root-cause + the prevention item; a senior reviewer would check it names the stampede mechanism, not just the symptom.", "ru": "" }
}
```

The other 7 milestones (`frame`, `design`, `build-core`, `cache-and-protect`, `test`, `deploy`,
`observe`) follow spec §3 for their `goal`/`definitionOfDone`/`feedsFrom` (keys from Task 1 Step 2),
authored at the same depth.

- [ ] **Step 1:** Write the full EN JSON (RU fields left as `""` for now — Task 3 fills them; the build is not run until Task 4, so an interim RU-empty file on disk is fine).
- [ ] **Step 2:** Sanity-check it is valid JSON: `cd site && node -e "JSON.parse(require('fs').readFileSync('src/content/projects/url-shortener-at-scale.json','utf8')); console.log('valid json')"`.
- [ ] **Step 3:** Commit: `git add site/src/content/projects/url-shortener-at-scale.json && git commit -m "feat(capstone): url-shortener-at-scale project — EN content"`

---

## Task 3: Author the RU translations

**Files:** Modify `site/src/content/projects/url-shortener-at-scale.json`

- [ ] **Step 1:** Fill every `ru` field with a real Russian translation of its `en` sibling (titles, pitch, deliverable, brief, every milestone `title`/`goal`/`definitionOfDone[]`/`reviewPrompt`, and every `seniorStretch`). Keep technical terms per `src/i18n/glossary.json`; translate prose, do not mirror English. Acronyms/code identifiers may stay identical (they are <25 chars and/or not prose).
- [ ] **Step 2:** Check no prose field is left mirrored:
  `cd site && node -e "const d=require('./src/content/projects/url-shortener-at-scale.json'); const bts=[]; (function w(n){Array.isArray(n)?n.forEach(w):(n&&typeof n==='object'&&(typeof n.en==='string'&&typeof n.ru==='string'&&bts.push(n),Object.values(n).forEach(w)))})(d); const bad=bts.filter(b=>b.en.length>=25&&b.en.trim()===b.ru.trim()); console.log('mirrored prose fields:',bad.length); bad.slice(0,5).forEach(b=>console.log(' ',b.en.slice(0,40)))"`
  Expected: `mirrored prose fields: 0`.
- [ ] **Step 3:** Commit: `git add ... && git commit -m "feat(capstone): url-shortener-at-scale — RU translations"`

---

## Task 4: Validate (build + capstones lint)

**Files:** none (verification).

- [ ] **Step 1:** Run the build: `cd site && bun run build 2>&1 | tail -20`.
  Expected: build succeeds; `lint: clean — 0 errors`. The build validates `ProjectSchema` (a
  bad enum/missing field fails fast) and runs the `capstones` lint (i18n + feedsFrom format/track).
- [ ] **Step 2:** If the lint reports a `feedsFrom` error (bad format or unknown track) or an
  `untranslated (en === ru)` error, fix the offending field and re-run. Do not weaken the content
  to pass — fix the key or finish the translation.
- [ ] **Step 3:** Confirm the page rendered: `ls site/dist/en/projects/url-shortener-at-scale/index.html site/dist/ru/projects/url-shortener-at-scale/index.html`.
  Expected: both exist.

---

## Task 5: Spot-check render + finish

**Files:** none.

- [ ] **Step 1:** Grep the rendered page for milestone titles to confirm content + cross-links:
  `grep -o "Survive a cache stampede" site/dist/en/projects/url-shortener-at-scale/index.html | head -1`
  Expected: the milestone title appears.
- [ ] **Step 2:** Confirm it is listed in the Projects hub render (the glob loader picks it up):
  `grep -l "url-shortener-at-scale" site/dist/en/projects/index.html` (or the projects landing route).
  Expected: a match (the card links the new capstone).
- [ ] **Step 3:** Final commit if anything changed in Task 4 fixes:
  `git add -A && git commit -m "feat(capstone): validate url-shortener-at-scale build + render"` (skip if clean).

---

## Self-review

**Spec coverage (spec §2–§5):**
- Project JSON on existing framework, no new infra → Task 2 (single file), File structure.
- 8 GuidedMilestones with the lifecycle arc → Task 2 (exemplar + spec §3 for the rest).
- Real `feedsFrom` spine keys → Task 1 Step 2 (verified keys).
- seniorStretch → Task 2 top-level.
- Bilingual EN+RU, no mirrored prose → Task 2 (EN) + Task 3 (RU) + Task 3 Step 2 check + Task 4 lint.
- Validation (ProjectSchema + capstones lint + render) → Task 4 + Task 5.

**Placeholder scan:** the `<RU in Task 3>` / `""` RU fields are an intentional staged interim
(filled in Task 3 before the build in Task 4) — not a shipped placeholder; the build's lint
gate fails if any prose RU stays empty/mirrored. The 7 non-exemplar milestones reference spec
§3 + the locked feedsFrom keys — concrete enough to author at the exemplar's depth.

**Consistency:** `slug` `url-shortener-at-scale` is used identically in the file path, the JSON
`slug`, the dist path, and the hub grep. `feedsFrom` keys are the same real keys in Task 1 and
Task 2. `tracks`/`category`/`difficulty`/`estDays` match the ProjectSchema enums/types.
