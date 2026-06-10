# Design: Metrics, Lesson Feedback, Roadmap UX, 4 Pilot Tracks

**Date:** 2026-06-10
**Mode:** autonomous (owner delegated all decisions and left; spec records decisions, no approval gate)

## Goals (owner's words, paraphrased)

1. Metrics: which lessons users open, time spent there, average correct-answer ratio.
2. Per-lesson "ask a question" so readers flag what's unclear; owner uses it to improve lessons.
3. New courses: logic (general development, better grasp of algorithms), React, Next.js, Go.
4. Easy navigation to the planning page (/roadmap) to see "what to do today".
5. Roadmap clarity: a step says "пройти урок «Что такое компьютер»" — unclear whether that
   means one lesson or the whole unit. Make it explicit.

## Context

- Static Astro 5 site on Cloudflare Pages, deployed by `wrangler pages deploy site/dist`
  from repo root → `functions/` (Pages Functions) deploys alongside automatically.
- Server infra already on main: `functions/_middleware.ts` (session resolve + per-IP
  rate limit 60 writes/min), D1 binding `DB`, KV `SESSIONS`, migration 0001 (users, progress).
- No analytics of any kind exist today. All user state is localStorage.
- Roadmap step = **unit** (PathStep.unit), rendered by `UnitRow.tsx`; "Start" links to the
  unit's first lesson. The label never says how many lessons the unit holds — that's bug #5.
- Adding a track requires: `types/index.ts` (Track union + TRACKS), `track-band.ts`,
  `tracks.json`, `units.json`, `path/concepts.json`, `path/unit-concepts.json`,
  `PRACTICE_REQUIRED_TRACKS` in `lint/rules/practice.ts`.

## Decisions

### A. Metrics pipeline (anonymous, low-volume, raw events in D1)

**Client** — `site/src/scripts/metrics.ts`:
- Anonymous id `awesome.metrics.id` (crypto.randomUUID) in localStorage. No PII, no IP stored.
- In-memory event queue; flush via `navigator.sendBeacon("/api/events", …)` on `pagehide`
  and when the queue reaches 10 events. Fire-and-forget: any failure is silent — a static
  site must never break because the metrics backend is missing.
- Events:
  - `lesson_view` `{lesson, track, lang}` — once per lesson page load.
  - `lesson_time` `{lesson, seconds}` — accumulated active time (Page Visibility API:
    pause when hidden), sent on pagehide. Capped at 60 min to keep idle tabs from skewing data.
  - `practice_result` `{lesson, taskId, taskType, correct}` — every graded attempt
    (blanks check, sandbox run verdict, debug run verdict). `review` tasks have no
    correctness — not instrumented.

**Server** — `functions/api/events.ts` (POST, anonymous):
- Accepts an array of ≤20 events, validates shape, inserts into D1 `events` table.
- Table: `events(id INTEGER PK, client_id TEXT, ts INTEGER, type TEXT, lesson TEXT,
  track TEXT, lang TEXT, task_id TEXT, task_type TEXT, correct INTEGER, seconds INTEGER)`.
  Raw rows; aggregate at read time. Volume is hobby-scale — no rollups needed (YAGNI).
- Migration `0002_metrics_feedback.sql`.

### B. Lesson questions (feedback)

- `LessonQuestion.tsx` island at the bottom of every lesson page: "Непонятно что-то?
  Задай вопрос" → textarea (≤2000 chars) → POST `/api/feedback`
  `{lesson, track, lang, text}` + anon client id. Success/failure message inline.
- Table: `feedback(id INTEGER PK, ts INTEGER, client_id TEXT, lesson TEXT, lang TEXT,
  text TEXT)`. Covered by existing per-IP write rate limit.

### C. Owner admin view

- `site/src/pages/admin.astro` (single page, no lang prefix) + Preact island.
- Token-gated: `ADMIN_TOKEN` env var on the Pages project; the page asks for the token
  once, stores it in localStorage, sends it as `Authorization: Bearer`.
- `functions/api/admin/summary.ts` (GET): constant-time token compare, returns JSON:
  per-lesson `{views, uniqueClients, avgSeconds, attempts, correctRatio}` + latest 100
  questions. One endpoint, one page — no charts library, plain tables.
- **Operator setup required before data flows:** D1 database must exist and migrations
  applied; `ADMIN_TOKEN` secret set. Documented in the admin page itself when the API
  returns an error.

### D. Navigation to planning

- `TopNav.astro`: add "Plan / План" link to `/{lang}/roadmap` (between Atlas and English).
- `TitleBar.astro`: same link for lesson-page chrome.
- Labels via `ui.json`.

### E. Roadmap step clarity

- `UnitRow.tsx`: under the unit title show "N lessons · ~M min" (bilingual), and lesson
  progress "K/N lessons done" derived from per-lesson localStorage history. The step IS
  a unit — say so visually instead of explaining.
- `TodayFocus.tsx`: CTA becomes "Start lesson 1 of N" (or "Continue — lesson K of N"
  when partially done); add one-line subtext: "A step = one unit; finish all its lessons."
- `ui.json` EN+RU additions.

### F. Four pilot tracks

| slug | band | units (2 each, 3 lessons per unit) | depth |
|------|------|-------------------------------------|-------|
| `logic` | foundations | 01-propositional-logic, 02-reasoning-and-proof | zero-level, foundations register, feeds algorithms |
| `react` | surface | 01-rendering-model, 02-hooks-and-state | senior bar |
| `nextjs` | surface | 01-rendering-strategies, 02-app-router-and-data | senior bar |
| `go` | surface | 01-language-core, 02-concurrency | senior bar |

- Pilot depth mirrors the aws/python precedent (6 lessons/track, expansion later).
- Every lesson: EN+RU MDX, frontmatter per schema, ≥1 structural diagram (DiagramFrame
  kit), practice JSON 3–8 tasks, `status: ready`, summary ≤280 chars.
- Registration (types, band, tracks/units/concepts/unit-concepts, practice lint) done
  centrally first; content authored by 8 parallel subagents (one per track×unit) with
  the standard contamination scan before build.

## Branching

- `feat/metrics-feedback` → A+B+C
- `feat/roadmap-clarity-nav` → D+E
- `feat/tracks-pilot-4` → F
- Each merged to main after green `bun run build` (lint 0/0) + unit tests + functions tests; push at end.

## Out of scope

- Real-time dashboards, charts, retention/funnel analytics.
- Email/notification on new questions.
- Deep (>6 lesson) coverage of the four new tracks — expansion is a follow-up.
- Consent banners: data is anonymous usage telemetry with no PII; revisit if auth-linked.

## Error handling

- Client metrics/feedback: silent no-op on network/server failure (site never degrades).
- Events endpoint: 400 on malformed payload, 413 on oversize, middleware 429 on abuse.
- Admin endpoint: 401 on bad token; page surfaces setup instructions on 500 (D1 missing).

## Testing

- functions: vitest unit tests for events validation, feedback validation, admin auth
  (mirroring existing functions/test style).
- site: existing unit-test suite must stay green; build lint 0 errors / 0 warnings.
- Manual visual check of lesson page (question widget), roadmap, admin page, 4 track pages.
