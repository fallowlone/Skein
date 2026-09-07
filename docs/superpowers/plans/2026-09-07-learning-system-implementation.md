# Learning System Implementation Plan

## Goal

Build a research-backed learning system for programming, mathematics and technical skills:
- durable memory instead of passive reading;
- recovery after long breaks;
- adaptive practice;
- concept mastery tracking;
- AI-assisted learning workflows.

## Phase 1 — Lesson mastery loop

- Add a repeatable learning cycle to lessons.
- Include recall, mental model check, application and delayed review.
- Connect the loop to existing lesson rendering.

Status: complete (confirmed: `MasteryLoop` is rendered by `Lesson.astro` on every lesson and names recall, mental-model checking, application, and later review. Existing `PracticeSection`, retrieval drawers, and SRS review provide the corresponding lesson actions.)

## Phase 2 — Concept mastery model

- Map lessons to concepts.
- Track understanding levels:
  - exposure;
  - understanding;
  - application;
  - explanation;
  - debugging.
- Reuse existing path engine data.

Status: complete (lesson concepts flow from the content schema into `Lesson.astro`; `path-io` owns the five levels and confidence mapping; `ConceptMastery` reads and writes that same path `knowledge` map through canonical mutators; no component-local mastery map or `UserState.conceptMastery` exists. The UI rehydrates its displayed level from effective path knowledge.)

## Phase 3 — Adaptive spaced repetition

- Extend review system beyond flashcards.
- Add engineering task reviews and retrieval practice.
- Use existing SRS infrastructure.

Status: complete (practice and retrieval tasks seed the existing SRS store; self-grades are timestamped, failures resurface their practice cards through the existing SRS scheduler, and timestamped mistakes are ordered by recency. Cards with explicit concept links contribute direct concept-level evidence while legacy cards retain unit-level aggregation and legacy self-grade records remain readable.)

## Phase 4 — Returning learner recovery

- Detect long inactivity.
- Run lightweight diagnostics.
- Generate a recovery path.

Status: complete (canonical `<track>/<unit>/<lesson>` keys are recorded and read; inactivity links to the working `?unit=<track>/<unit>` diagnostic route)

## Phase 5 — AI tutor modes

- Socratic tutor.
- Debugging coach.
- Interview simulation.
- Hint-based assistance.

Status: complete (four BYOK tutor modes are rendered after the optional lesson practice block and receive canonical lesson/concept/mastery context plus recent practice/self-grade/review mistakes; successful exchanges append at most 50 history entries to `UserState` without changing mastery. A Preact runtime integration test exercises both practice-present and practice-absent mounts, all four mode controls, an async BYOK response, bounded persistence, and unchanged mastery.)

Completed in latest step:
- Tutor modes receive lesson-aware context.
- Context boundary exposes lesson key and covered concepts.
- Tutor component is rendered from the shared lesson layout, after optional practice, for lessons with or without authored practice.

Evidence:
- `site/src/scripts/ai-tutor.ts` derives recent mistakes from `practice-state`, retrieval ratings, and `review-state`.
- `site/src/components/pedagogy/AiTutorModes.tsx` passes lesson key, concepts, effective path mastery, and bounded mistake context to `askTutor`.
- `site/src/scripts/user-state.ts` stores bounded `tutorHistory`; no AI response promotes mastery.
- `site/src/scripts/ai-tutor.test.ts` covers request context and mistake extraction.

Completed:
- AI tutor execution path connected through existing BYOK transport.
- Tutor requests accept learner mastery context.
- Transport contract is covered by unit test.

## Verification

- Verify each phase against actual code state.
- Do not run local build unless required.
- Push changes if CI build is required.

Targeted verification evidence run on 2026-09-07:
- `bunx vitest run src/scripts/ai-tutor.test.ts src/components/pedagogy/AiTutorModes.test.tsx src/scripts/path/path-io.test.ts src/scripts/path/path-io.review-evidence.test.ts src/scripts/path/knowledge.test.ts src/scripts/practice-state.test.ts src/scripts/review-harvest.test.ts src/scripts/review-state.test.ts src/components/pedagogy/PracticeSection.test.tsx src/components/pedagogy/RetrievalDrawer.test.tsx src/components/pedagogy/SpacedRevisitBanner.test.tsx src/scripts/returning-learner.test.ts src/scripts/user-state.test.ts src/scripts/account-sync.test.ts` from `site/` — 14 files, 155 tests passed.
- `bunx astro check` from `site/` — 0 errors, 0 warnings, 52 non-blocking hints. The hints are existing project diagnostics; no hint points to the changed recovery/tutor wiring.
- `git diff --check` — clean.
- `rg -n "conceptMastery|CONCEPT_MASTERY_LEVELS|setConceptMasteryLevel|advanceConceptMastery" site/src` — one persisted concept mastery store (`path-io` knowledge) and its canonical mutators; no `UserState.conceptMastery` field.
- `rg -n "canonicalLessonKey|data-returning|calibrate\\?unit=|AiTutorModes|recentMistakes|recordTutorOutcome" site/src/layouts/Lesson.astro site/src/components/lesson site/src/components/pedagogy site/src/scripts` — confirms canonical lesson keys, actionable recovery links, tutor placement, mistake context, and bounded outcome storage.

Completion audit:
- Phase 1 — complete: lesson-wide mastery loop is rendered and its four required stages are present.
- Phase 2 — complete: lesson concepts map into the path model; the UI now reads and writes canonical path knowledge with no duplicate mastery state.
- Phase 3 — complete: practice, retrieval, and self-grade outcomes seed/use the existing SRS store; timestamps drive recency ordering, and legacy records remain readable.
- Phase 4 — complete: inactivity uses canonical history keys and links to `calibrate?unit=<track>/<unit>`, review, and roadmap destinations.
- Phase 5 — complete: the runtime integration test covers both practice variants, all four modes, context-bearing BYOK execution, bounded history, and no mastery mutation.
- Astro conditional rendering — confirmed valid by `astro check`; the lesson practice condition and adjacent tutor render produce no diagnostics.

Known limitations: no full build or browser/SSR smoke test was run by request; CI remains the authority for the full generated site. No commit or push was made during this audit.
