# CLI / command-line track — design

> Sub-project 1 of a phased program (CLI → Linux → Homelab-practice → patterns
> cluster). Each sub-project gets its own spec → plan → implementation cycle.
> This spec covers the **CLI track** only.

## Goal

A bilingual (EN+RU) command-line track on the curriculum site that takes a
learner from "never opened a terminal" to confident shell power-user. Two-tier:
a gentle beginner core, then senior power-user material.

## Audience & level

- **Two-tier.** Beginner core (zero/junior) assumes nothing; senior power-user
  units assume the core.
- Per-lesson `level` frontmatter: `zero`/`junior` for the core units, `middle`/
  `senior` for the power-user units.

## Target

- **bash / POSIX, Linux-first.** Portable, dovetails with the upcoming Linux
  track and the learner's home server.
- macOS-vs-Linux differences (e.g. BSD vs GNU `sed`, `stat`, `readlink`) go in
  collapsible `<Inset>` asides — never derail the beginner main line.

## Architecture

- A new **linear `/teach`-style track** `cli` (Hook → Goal → Explanation →
  Visual → WorkedExample → Practice → Check → Recap, with optional `<Inset>`),
  the same skeleton as the `math`/`algorithms`/`base-cs` foundations tracks.
- **Tiering on a linear spine:** beginner units come first (01–05), senior
  power-user units later (06–10); within any lesson, deeper/edge/OS-specific
  material lives in `<Inset>` blocks so the core stays uncluttered.

## Unit outline

**Beginner core (Phase 1 — the small first plan):**

1. `01-the-shell` — what a terminal/shell is; prompt, command, arguments;
   `pwd`, `ls`, `cd`.
2. `02-files-and-paths` — absolute vs relative paths, `.`/`..`/`~`; `mkdir`,
   `cp`, `mv`, `rm`, `cat`, `less`.
3. `03-streams-and-pipes` — stdin/stdout/stderr, `|`, `>`/`>>`/`<`, `grep`,
   `head`/`tail`, `wc`.
4. `04-finding-things` — `find`, `grep -r`, globs/wildcards, `which`/`type`.
5. `05-permissions-and-users` — `chmod`/`chown`, rwx bits, `sudo`, ownership
   (bridges to the Linux track).

**Senior power-user (Phase 2 — later plan):**

6. `06-text-processing` — `sed`, `awk`, `cut`, `sort`, `uniq`, `tr`.
7. `07-processes-and-jobs` — `ps`, `top`, `kill`, signals, `&`/`jobs`/`fg`/`bg`,
   `nohup`.
8. `08-shell-scripting` — variables, quoting, `$()`, conditionals, loops, exit
   codes, `set -euo pipefail`.
9. `09-ssh-and-remote` — `ssh`, key auth, `scp`/`rsync`, tmux basics (bridges to
   the Homelab sub-project).
10. `10-putting-it-together` — a small capstone unit.

## Practice mechanism (site constraint)

The site cannot execute a shell (its runnable sandbox is QuickJS for js/sql, and
runnable lesson samples run under `bun`). So CLI practice is honest about this:

- **Lessons:** shell shown in fenced blocks (illustrative, not executed) + a
  structural diagram per lesson from the existing kit (DiagramFrame / Flow /
  Sequence / Stack).
- **Practice tasks** (per the `practice` collection): **predict** (predict a
  command/pipeline's output from a given scenario), **diagnose** (fill in the
  command/flag/blank), **review** (spot bugs/footguns in a shell script),
  **design** (compose a pipeline/script for a goal).
- **Optional `sandbox`** that *models* shell behaviour in JS where a faithful
  model is cheap (precedent: the lock-queue task modelled FIFO locking in JS) —
  e.g. "predict the output of this `sort | uniq -c | sort -rn` pipeline" backed
  by a real `stdout-equals` check on a JS reimplementation. Never pretend the
  real shell runs.

## Integration & wiring

A new track touches the same seams every track does (see the new-track gotchas):

- `src/content/tracks.json` — add the `cli` track entry (title, etc.).
- `src/content/units.json` — add the `cli/*` units (union-dedup by id on merge).
- `TRACK_BAND` (placement/level band) — add `cli`.
- `track-meta.ts` `TRACK_ABBR` — add the `cli` abbreviation (the "6th wiring").
- Lessons under `src/content/lessons/{en,ru}/cli/<unit>/<lesson>/index.mdx`,
  authored via the `/teach` pipeline (linear skeleton + `<Inset>`).
- Practice JSON under `src/content/practice/cli/<unit>/<lesson>.json`.
- Bilingual EN+RU parity; a structural diagram on every ready lesson; build
  linter + `astro sync` + `lint:src` clean.

## Phasing (small → big)

- **Plan 1 (this cycle, small):** Phase-1 beginner core — start with the **track
  scaffold + unit `01-the-shell` as a vertical slice** to validate wiring, then
  units `02`–`05`. EN+RU, diagram + practice per lesson.
- **Plan 2:** Phase-2 senior power-user units `06`–`10`.
- **Later sub-projects** (separate brainstorm → spec → plan): Linux track;
  Homelab practice (mined from the learner's real docker/gluetun/wireguard/
  qbittorrent setup — **all secrets, keys, IPs, and hostnames sanitized to
  synthetic values**); clean-code / architecture-patterns / code-patterns tracks;
  React-patterns as an extension of the existing `react` track.

## Out of scope (for this spec)

- The Linux, Homelab, and patterns sub-projects (their own specs).
- Any real home-server data — that material enters only at the Homelab phase,
  fully sanitized.
- Executing real shell commands in-browser (architecturally unavailable).

## Self-review

- **Placeholders:** none — every unit and mechanism is concrete.
- **Consistency:** the two-tier level model, the linear-spine architecture, and
  the unit split (01–05 core / 06–10 senior) agree throughout.
- **Scope:** focused on one track; Plan 1 is deliberately a small vertical slice
  first (scaffold + unit 01) before the rest of Phase 1.
- **Ambiguity:** practice cannot run a real shell — stated explicitly so the
  implementation never fakes execution.
