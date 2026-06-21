# CLI Track — Phase 2 (senior power-user) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the senior power-user tier of the `cli` track (units `06`–`10`) on the curriculum site, building on the shipped Phase-1 core (units 01–05). One implementer subagent per unit; controller self-reviews (content), commits, pushes to `main`.

**Architecture:** The `cli` track is already fully registered (6 seams — see Global Constraints). Phase 2 adds ONLY units + lessons + practice. Same linear `/teach` skeleton as Phase 1; senior tier means `level: middle`/`senior`, heavier `review`/`design` practice, deeper `<Inset>` footgun asides.

**Tech Stack:** Astro 5 content collections, MDX, the `/teach` linear lesson skeleton + `<Inset>`, the diagram kit (`FlowDiagram` for node/edge graphs — NOT StructureFigure, which takes `cells[]`), the `practice` collection (incl. JS-modelled `sandbox`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-06-21-cli-track-design.md`.
- Bilingual EN+RU parity on every lesson (i18n glossary respected).
- Target: bash / POSIX, Linux-first; macOS/BSD-vs-GNU differences (BSD `sed`/`awk`/`stat`/`ps`) only in `<Inset>` asides.
- Practice CANNOT execute a real shell. Allowed task types: `predict`, `diagnose`, `review`, `design`, and `sandbox` ONLY when it faithfully MODELS shell behaviour in synchronous JS with a real `stdout-equals` check (QuickJS does not drain the Promise queue — sync only). Never fake shell execution.
- Every ready lesson carries `level` frontmatter (`middle`/`senior` for these units) and exactly ONE structural diagram via `<FlowDiagram label=… nodes={…} edges={…}>` (nodes `{id,label,sub?}`, edges `{from,to,label?}`). `label` is required (aria-label).
- Lesson MDX template to copy: `site/src/content/lessons/en/cli/03-streams-and-pipes/03-pipes-and-grep/index.mdx` (a Phase-1 lesson already using FlowDiagram correctly). Practice template: `site/src/content/practice/cli/01-the-shell/03-where-am-i.json`; sandbox template: `site/src/content/practice/databases/07-sharding/05-hot-shard-failure.json`.
- The track is ALREADY wired into all SIX seams; do NOT touch `src/types/index.ts`, `tracks.json`, `track-band.ts`, `track-meta.ts`, or `mastery-field.ts` `DOMAIN_FAMILIES`. Phase 2 edits only `units.json` + new lesson/practice files.
- **Gate per task:** `bunx astro sync` + `bun scripts/lint-src.mjs` clean + EN/RU parity. **Gate at completeness pass (Task 6): full `bun run build` (lint:src never renders → only the build catches bad component props) AND `bun run test` (catches the test-only DOMAIN_FAMILIES seam) AND `bun run verify:samples`.**

---

### Task 1: Unit 06 — text processing

**Files:** Modify `units.json` (+`cli/06-text-processing`). Create lessons `{01-cut-and-fields,02-sort-and-uniq,03-sed-substitution,04-awk-essentials}` EN+RU + practice.

**Lessons:** `cut`/fields/delimiters; `sort` keys + `uniq -c` + `sort -rn`; `sed` substitution/delete/in-place; `awk` fields/`NR`/patterns. level: middle. The `sort | uniq -c | sort -rn` "top-N" pipeline is the canonical JS-modelled `sandbox` here.

- [ ] **Step 1:** Add `cli/06-text-processing` to `units.json` (order 6).
- [ ] **Step 2:** `bunx astro sync` → clean.
- [ ] **Step 3:** Author 4 lessons via `/teach`, EN+RU, one FlowDiagram + `level: middle` each.
- [ ] **Step 4:** Practice per lesson (predict/diagnose/review/design); one `sandbox` modelling the top-N pipeline in sync JS with a real `stdout-equals`.
- [ ] **Step 5:** `bunx astro sync && bun scripts/lint-src.mjs` clean; EN/RU parity; sandbox `expected.value` = its `setup` output.
- [ ] **Step 6:** Commit `content(cli): unit 06 text-processing EN+RU`.

---

### Task 2: Unit 07 — processes and jobs

**Files:** Modify `units.json` (+`cli/07-processes-and-jobs`). Create lessons `{01-processes-and-ps,02-signals-and-kill,03-jobs-and-backgrounding,04-monitoring-resources}` EN+RU + practice.

**Lessons:** process model + PID + `ps`; signals (SIGTERM/SIGINT/SIGKILL) + `kill`/`kill -9`; `&`/`jobs`/`fg`/`bg`/Ctrl-Z/`nohup`/`disown`; `top`/load/resource use. level: middle. Footguns (`<Inset>`): `kill -9` skips cleanup; orphaned background jobs.

- [ ] **Step 1:** Add `cli/07-processes-and-jobs` (order 7). **Step 2:** sync clean.
- [ ] **Step 3:** 4 lessons EN+RU, one FlowDiagram + `level: middle` each. **Step 4:** practice (a `diagnose` "which signal" + a `review` of a bad `kill -9` habit fit well).
- [ ] **Step 5:** sync+lint clean; parity. **Step 6:** Commit `content(cli): unit 07 processes-and-jobs EN+RU`.

---

### Task 3: Unit 08 — shell scripting

**Files:** Modify `units.json` (+`cli/08-shell-scripting`). Create lessons `{01-variables-and-quoting,02-conditionals-and-exit-codes,03-loops-and-arguments,04-robust-scripts}` EN+RU + practice.

**Lessons:** variables + quoting rules + `$()`; `[[ ]]`/`test`/exit codes/`&&`/`||`; `for`/`while`/`$@`/`$1`/`read`; `set -euo pipefail` + `trap` + functions. level: middle (01-03) / senior (04). This unit is the best home for `review` tasks (spot the quoting/exit-code footgun in a script) and an optional `sandbox` modelling exit-code/conditional logic in JS.

- [ ] **Step 1:** Add `cli/08-shell-scripting` (order 8). **Step 2:** sync clean.
- [ ] **Step 3:** 4 lessons EN+RU, one FlowDiagram + `level` each. **Step 4:** practice; ≥2 `review` tasks with planted footguns (unquoted `$var`, missing `set -e`).
- [ ] **Step 5:** sync+lint clean (if a sandbox added, also `verify:samples`); parity. **Step 6:** Commit `content(cli): unit 08 shell-scripting EN+RU`.

---

### Task 4: Unit 09 — ssh and remote

**Files:** Modify `units.json` (+`cli/09-ssh-and-remote`). Create lessons `{01-ssh-basics,02-key-authentication,03-scp-and-rsync,04-tmux-basics}` EN+RU + practice.

**Lessons:** `ssh user@host` + `~/.ssh/config`; keypairs + `ssh-keygen` + `authorized_keys` + agent; `scp` vs `rsync` (and `rsync -a --delete` footgun); `tmux` sessions/windows/panes/detach-attach. level: senior. Bridges to the Homelab sub-project. **Use ONLY synthetic hosts/users/IPs (e.g. `deploy@server.example`, `198.51.100.x`) — NO real home-server data.**

- [ ] **Step 1:** Add `cli/09-ssh-and-remote` (order 9). **Step 2:** sync clean.
- [ ] **Step 3:** 4 lessons EN+RU, one FlowDiagram + `level: senior` each. **Step 4:** practice (a `design` "sync this dir to a remote safely" + a `review` of a dangerous `rsync --delete`).
- [ ] **Step 5:** sync+lint clean; parity; confirm no real-host data. **Step 6:** Commit `content(cli): unit 09 ssh-and-remote EN+RU`.

---

### Task 5: Unit 10 — putting it together (capstone)

**Files:** Modify `units.json` (+`cli/10-putting-it-together`). Create lessons `{01-log-analysis-pipeline,02-a-maintenance-script,03-remote-ops-capstone}` EN+RU + practice.

**Lessons:** compose `find`+`grep`+text-processing into a log-analysis one-liner; write a small robust maintenance script (backup/cleanup with `set -euo pipefail`); a remote-ops scenario (`ssh`+`rsync`+`tmux`). level: senior. Capstone = synthesis; lean on `design` + `review` + a `sandbox` modelling the log-analysis pipeline.

- [ ] **Step 1:** Add `cli/10-putting-it-together` (order 10). **Step 2:** sync clean.
- [ ] **Step 3:** 3 lessons EN+RU, one FlowDiagram + `level: senior` each. **Step 4:** practice; one `sandbox` modelling the log-analysis pipeline (sync JS, real `stdout-equals`).
- [ ] **Step 5:** sync+lint clean (+`verify:samples` for the sandbox); parity. **Step 6:** Commit `content(cli): unit 10 putting-it-together EN+RU`.

---

### Task 6: Phase-2 completeness pass

**Deliverable:** the `cli` track is a coherent 10-unit arc (Phase 1 + Phase 2), discoverable and fully green.

- [ ] **Step 1:** Verify `units.json` lists all 10 cli units (orders 1–10, unique); routes resolve.
- [ ] **Step 2:** Full gate: `cd site && bun run build` (5813 + new pages, lint clean) AND `bun run test` (all green) AND `bun run verify:samples` (all samples + sandboxes pass).
- [ ] **Step 3:** Confirm contamination scan clean across `cli/06`–`10`, EN/RU parity, one FlowDiagram per lesson, all sandbox `expected.value` match their `setup`.
- [ ] **Step 4:** Commit any fixes `content(cli): phase-2 completeness pass`.

---

## Self-Review

- **Spec coverage:** units 06–10 (senior power-user) ✔; bash/POSIX Linux-first + `<Inset>` for macOS/BSD ✔; no-shell-exec practice via predict/diagnose/review/design + JS-modelled sandbox ✔; FlowDiagram + `level` per lesson ✔; bilingual ✔; ssh unit uses synthetic hosts only ✔.
- **Wiring:** track already registered (6 seams); Phase 2 touches only `units.json` + content — no seam edits.
- **Lessons learned from Phase 1 baked in:** FlowDiagram not StructureFigure; full `bun run build` + `bun run test` gate at completeness (lint:src never renders; DOMAIN_FAMILIES seam is test-only) — both already satisfied here since seams are unchanged, but the build/test gate still runs to catch render/schema regressions.
- **Scope:** Phase 2 only (units 06–10); Linux/Homelab/patterns sub-projects are separate specs.
