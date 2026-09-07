# AGENTS.md

Skein is an Astro 5 + Preact + Tailwind bilingual curriculum site. Work in `site/`; generated output lives in `site/dist/` and must not be edited.

## Scope

- Canonical curriculum data: `site/src/content/tracks.json`, `site/src/content/units.json`, and lessons under `site/src/content/lessons/{en,ru}/...`.
- Fullstack units use `/infographic`; foundations (`math`, `algorithms`, `base-cs`) use `/teach`.
- Preserve EN/RU parity for authored lessons.
- Fullstack lessons target middle+/senior depth. `curriculum.md` is the source of truth for domain and depth constraints.
- Visual/component rules live in `style-guide.md`.

## Existing patterns first

Inspect nearby implementations before editing. Reuse existing components, utilities, data shapes, and lint rules. Keep diffs small and do not add dependencies unless explicitly requested.

Useful locations:
- `site/src/components/` — UI, pedagogy, prose, diagrams, lesson chrome.
- `site/src/pages/[lang]/learn/` — learning routes.
- `site/src/content/` — curriculum content and supporting collections.
- `site/src/lint/rules/` — build-time content rules.
- `.Codex/commands/infographic.md` — canonical `/infographic` workflow.
- `docs/superpowers/specs/2026-05-16-foundations-algorithms-track-design.md` — foundations `/teach` spec.

## Required checks

- Prefer `bun`.
- For normal code changes, run targeted tests/typecheck/lint relevant to the touched area.
- If lesson content changes, run `bun run build` from `site/` and inspect `dist/lint-report.json`.
- If a `run`-tagged code sample changes, also run `bun run verify:samples`.
- Do not leave `console.log` in production code.

## Local build and CI workflow

- Use local builds only when they are a fast and relevant signal for the touched area.
- The GitHub Actions CI/CD pipeline is the final verification authority for full builds and deployment checks.
- After completing a change, push the branch so CI/CD can validate the complete workflow.

## Authoring invariants

For `/infographic`, follow `.Codex/commands/infographic.md`; it defines research, bilingual authoring, text budgets, hydration cap, status flow, visual verification, and commit convention. Do not duplicate that workflow here.

For `/teach`, follow the foundations spec referenced above. Lessons remain bilingual and use the same lesson content tree.

## Tool routing

- Use Context7/current docs before coding against unfamiliar libraries or SDKs.
- Use Figma tools for Figma URLs and Excalidraw only when a diagram task calls for them.
- Do not launch GUI browser executables directly from shell when `CODEX_SANDBOX` is set; use managed browser/computer tools or headless rendering.

## Working style

Be direct, evidence-based, and concise. Do not guess APIs, versions, flags, SHAs, or package names. Verify before claiming completion.
