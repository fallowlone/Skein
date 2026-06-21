# Linux Track Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a new bilingual (EN+RU) linear foundations track `linux` — 12 units / 46 lessons — that teaches the operating system under the shell, building on the shipped CLI track.

**Architecture:** A new `/teach`-style track registered through six coupled seams, then authored unit-by-unit. Commit 1 is a vertical slice (all TS seams + unit 01) to validate wiring; commits 2–12 add one unit each. Each lesson is a linear MDX file (Hook→Goal→Step→Visual→WorkedExample→Practice→Check→Recap) with exactly one `FlowDiagram`, mirrored EN+RU, plus one practice JSON. The controller dispatches one implementer subagent per unit, self-reviews, runs the verify gate, commits, and pushes.

**Tech Stack:** Astro 5, Preact, Tailwind, MDX, Zod content collections, bun. Source of truth: `docs/superpowers/specs/2026-06-21-linux-track-design.md`.

## Global Constraints

Every task implicitly includes all of these (copied verbatim from the spec; do not re-derive):

- **Depth bar:** middle+/senior fullstack engineer. If a draft reads like a `man` page, it is too shallow.
- **Distro lens:** Debian/Ubuntu-first (`apt` + `systemd`). RHEL/Fedora (`dnf`/`firewalld`) and macOS only as `<Inset>` asides.
- **Bilingual or refuse:** every lesson exists under BOTH `src/content/lessons/en/linux/...` and `src/content/lessons/ru/linux/...`. Quiz `id` identical across langs. `pieceSlug` = lesson slug.
- **Frontmatter keys (exact set):** `concepts`, `estMin`, `lang`, `lessonType: concept`, `level` (`junior`|`middle`|`senior`), `mathPrereqs: []`, `order`, `prereqs: []`, `slug`, `sources` (≥1 real `man7.org`/`freedesktop.org`/`gnu.org`/`kernel.org` URL), `status: ready`, `summary` (≤280 chars EN and RU; do not over-trim), `title`, `track: linux`, `unit: <NN-slug>`.
- **Imports use the `~/` alias, never `../`.**
- **EXACTLY ONE `FlowDiagram` per lesson** (`label`, `caption`, `nodes:[{id,label,sub}]`, `edges:[{from,to,label}]`). NEVER `StructureFigure` (it takes `cells[]` and crashes the build on `nodes`/`edges`).
- **Practice:** one JSON per lesson at `src/content/practice/linux/<NN-unit>/<NN-lesson>.json`; `lessonKey="linux/<NN-unit>/<NN-lesson>"`, `track="linux"`, `tasks[]` 3–5 (≤8). Types: `predict`/`diagnose`/`review`/`design`/`incident`. `sandbox` ONLY for synchronous-JS rule modeling with a real `expected:{kind:"stdout-equals",value}` that equals actual setup output.
- **MDX hazards:** no `\"` inside a double-quoted JSX attribute — use single-quote delimiter (`caption='…"x"…'`). No harness leakage (`system-reminder`, `antml:`, `<function`).
- **Practice type-shape traps:** `diagnose` uses `grading.blanks`|`grading.self`, NEVER `scenario`/`reveal` (that is `predict`). Every `review` finding has `planted: true`. `design` needs `rubric` length ≥2. `incident` needs 3–6 `steps`, each `{label,prompt,reveal}`.
- **Verify gate (from `site/`):** `bun run build` (full Astro build + linter; cold ~45–60 min, but the incremental build cache makes per-unit re-runs fast once warm) AND `bun run test` (catches the test-only 6th seam + schema mirrors) AND `bun run verify:samples` (final gate). `sync`+`lint:src` alone is INSUFFICIENT.
- **Commit convention:** `content(linux): <NN-unit> EN+RU ready`; push to `main` per unit. No co-author footer (attribution disabled globally).
- **Fact-Forcing Gate:** a PreToolUse hook requires presenting 4 facts before EVERY `Write`/`Edit`/`Bash`. Implementer subagents MUST present the 4 facts (file callers / no-duplicate / data-shape / verbatim instruction) before each such call, then retry.

## File Structure

- **Seam files (edited once, Task 0):** `src/types/index.ts`, `src/content/tracks.json`, `src/components/atlas/track-band.ts`, `src/scripts/track-meta.ts`, `src/scripts/path/mastery-field.ts`.
- **Per-unit, every task:** append to `src/content/units.json`; create `src/content/lessons/{en,ru}/linux/<NN-unit>/<NN-lesson>/index.mdx` (×lessons×2); create `src/content/practice/linux/<NN-unit>/<NN-lesson>.json` (×lessons).
- **Ledger:** `.superpowers/sdd/progress.md`.

---

## Per-Unit Protocol (the standard step sequence for Tasks 1–11; Task 0 wraps it with the seam edits)

Each unit task runs these steps. The task body supplies only the unit-specific payload: the `units.json` entry (verbatim) and the lesson table (from spec §5).

- [ ] **P1 — Read context.** Read spec `docs/superpowers/specs/2026-06-21-linux-track-design.md` §3, §4, and the §5 block for this unit. Read the template lesson `src/content/lessons/en/cli/03-streams-and-pipes/03-pipes-and-grep/index.mdx` (+ ru) and template practice `src/content/practice/cli/01-the-shell/03-where-am-i.json`.
- [ ] **P2 — Author EN lessons.** For each lesson in the table: write `src/content/lessons/en/linux/<unit>/<lesson>/index.mdx` to the depth bar — Hook (why it matters, an operator framing), Goal, numbered `<Step>`s teaching the mechanism, exactly one `<FlowDiagram>`, a `<WorkedExample>`, 1–2 `<Inset>` asides (macOS/RHEL/SysV where relevant), a `<Check>` `<Quiz>`, a `<Recap>`. Exact frontmatter per Global Constraints; `order` = lesson number; `level` per the table.
- [ ] **P3 — Author RU lessons.** Mirror each EN lesson to `.../ru/linux/<unit>/<lesson>/index.mdx`: translate prose, keep code/commands identical, keep Quiz `id` identical, `lang: ru`, RU `summary` ≤280. Use established glossary terms; keep technical identifiers in original form.
- [ ] **P4 — Author practice.** One JSON per lesson, 3–5 tasks, type mix per Global Constraints. Bilingual `{en,ru}` on every text field.
- [ ] **P5 — Register the unit.** Append this unit's entry to `src/content/units.json` (verbatim from the task payload).
- [ ] **P6 — Hazard scan (controller).** Grep all new files for `system-reminder`, `antml:`, `<function`; grep MDX for `\"` inside `"..."` attributes; verify every `diagnose` task uses `grading`, every `review` finding has `planted: true`, EN/RU lesson + practice counts match, Quiz ids match across langs.
- [ ] **P7 — Verify gate (controller).** From `site/`: `astro sync` then `bun run build` (background; gate on exit) and `bun run test` and `bun run verify:samples`. All must pass.
- [ ] **P8 — Commit + push (controller).** `git add` the unit's files + `units.json`; `git commit -m "content(linux): <NN-unit> EN+RU ready"`; `git push`. Update `.superpowers/sdd/progress.md`.

---

## Task 0: Scaffold + Unit 01 (vertical slice)

**Files:**
- Modify: `src/types/index.ts` — add `"linux"` to the `Track` union AND the `TRACKS` array.
- Modify: `src/content/tracks.json` — append the track entry.
- Modify: `src/components/atlas/track-band.ts` — `TRACK_BAND` add `"linux": "foundations"`.
- Modify: `src/scripts/track-meta.ts` — `TRACK_ABBR` add `"linux": "LIN"`.
- Modify: `src/scripts/path/mastery-field.ts` — add `"linux"` to the `foundations` family `tracks` array.
- Modify: `src/content/units.json` — append the unit-01 entry below.
- Create: 4 lessons × 2 langs + 4 practice JSON for `01-what-is-linux`.
- Create: `.superpowers/sdd/progress.md`.

**Interfaces — Produces:** the registered `linux` track that Tasks 1–11 extend. The exact seam edits:

- [ ] **Step 1 — `src/types/index.ts`.** In the `Track` union add `| "linux"` after `"cli"`; in the `TRACKS` array add `"linux",` after `"cli",`.
- [ ] **Step 2 — `src/content/tracks.json`.** Append:

```json
{
  "slug": "linux",
  "order": 40,
  "color": "sky",
  "title": { "en": "Linux, the operating system", "ru": "Linux: операционная система" },
  "blurb": {
    "en": "You can drive the shell — now learn the system under it: how Linux boots, runs services, manages users and storage, and how to keep it alive when it breaks.",
    "ru": "Ты умеешь работать в оболочке — теперь изучи систему под ней: как Linux загружается, запускает сервисы, управляет пользователями и хранилищем и как поддерживать его живым, когда он ломается."
  }
}
```

- [ ] **Step 3 — `track-band.ts`.** In `TRACK_BAND`, add `"linux": "foundations",` (e.g. directly after the `"cli": "foundations",` line).
- [ ] **Step 4 — `track-meta.ts`.** In `TRACK_ABBR`, add `"linux": "LIN",` (after `"cli": "CLI",`).
- [ ] **Step 5 — `mastery-field.ts`.** In `DOMAIN_FAMILIES`, the `foundations` family `tracks` array becomes `["math", "base-cs", "cli", "algorithms", "logic", "linux"] as Track[]`.
- [ ] **Step 6 — `units.json` unit-01 entry.** Append:

```json
{
  "id": "linux/01-what-is-linux",
  "slug": "01-what-is-linux",
  "track": "linux",
  "order": 1,
  "title": { "en": "What is Linux", "ru": "Что такое Linux" },
  "crux": {
    "en": "\"Linux\" is a kernel plus a userland assembled by a distribution. The kernel owns the hardware and the syscall boundary; everything above it — including the system's own state — is a file you can read.",
    "ru": "«Linux» — это ядро плюс пользовательское окружение, собранное дистрибутивом. Ядро владеет оборудованием и границей системных вызовов; всё выше него — включая состояние самой системы — это файл, который можно прочитать."
  },
  "lessons": ["01-kernel-and-userland", "02-distributions", "03-filesystem-hierarchy", "04-proc-and-sys"]
}
```

- [ ] **Step 7 — Author unit 01** via the Per-Unit Protocol P2–P4 using this lesson table:

| order | slug | level | angle / key concepts | source family |
|---|---|---|---|---|
| 1 | `01-kernel-and-userland` | junior | syscall boundary, ring 0 vs 3, kernel vs userspace, what the kernel actually does | man7 `syscalls(2)` |
| 2 | `02-distributions` | junior | distro = kernel + userland + package manager; Debian/Ubuntu/RHEL/Arch families; what differs | wiki.debian.org, distrowatch |
| 3 | `03-filesystem-hierarchy` | junior | FHS: `/etc /var /usr /bin /proc /sys /dev`; everything-is-a-file | man7 `hier(7)` |
| 4 | `04-proc-and-sys` | junior | procfs/sysfs as live kernel windows; reading `/proc/<pid>`, `/proc/meminfo` | man7 `proc(5)` |

- [ ] **Step 8 — Create the ledger** `.superpowers/sdd/progress.md` with a row per unit (status: pending).
- [ ] **Step 9 — Hazard scan + Verify gate** (Protocol P6–P7). This is the wiring validation: `bun run test` must pass (proves the 6th seam) and `bun run build` must render the new track pages.
- [ ] **Step 10 — Commit + push** (Protocol P8): `content(linux): scaffold + 01-what-is-linux EN+RU ready`.

---

## Tasks 1–11: Units 02–12

Each task runs the **Per-Unit Protocol** with the payload below. `units.json` entry shape is identical to Task 0 Step 6 (`id`, `slug`, `track:"linux"`, `order`, `title{en,ru}`, `crux{en,ru}` from spec §5, `lessons[]`). Author the `crux` EN+RU from the spec's per-unit crux line.

### Task 1 — Unit `02-boot-and-init` (order 2)

`lessons: ["01-the-boot-sequence","02-grub","03-pid1-and-init","04-targets-and-runlevels"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-the-boot-sequence` | junior | firmware→bootloader→kernel→initramfs→PID 1 | man7 `boot(7)`,`bootup(7)` |
| 2 | `02-grub` | middle | bootloader, kernel cmdline, recovery/single-user | gnu.org grub manual |
| 3 | `03-pid1-and-init` | middle | what init does, why PID 1 is special, systemd vs SysV | freedesktop `systemd(1)` |
| 4 | `04-targets-and-runlevels` | middle | `multi-user.target`, `isolate`, default target | freedesktop `systemd.target(5)` |

### Task 2 — Unit `03-systemd-and-services` (order 3)

`lessons: ["01-units-and-systemctl","02-writing-a-service","03-dependencies-and-ordering","04-sockets-and-targets"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-units-and-systemctl` | junior | unit types, `status/start/stop/enable` | freedesktop `systemctl(1)` |
| 2 | `02-writing-a-service` | middle | unit-file anatomy, `[Unit][Service][Install]`, `ExecStart`, `Restart=` | freedesktop `systemd.service(5)` |
| 3 | `03-dependencies-and-ordering` | middle | `Wants`/`Requires`/`After`/`Before`, target deps | freedesktop `systemd.unit(5)` |
| 4 | `04-sockets-and-targets` | senior | socket activation, custom targets | freedesktop `systemd.socket(5)` |

### Task 3 — Unit `04-package-management` (order 4)

`lessons: ["01-apt-and-repositories","02-dpkg-internals","03-dependencies-and-versions","04-dnf-and-the-rhel-side"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-apt-and-repositories` | junior | `apt`, `sources.list`, update vs upgrade, signing keys | man7 `apt(8)` |
| 2 | `02-dpkg-internals` | middle | `dpkg -i`, the package db, what a `.deb` contains | man7 `dpkg(1)` |
| 3 | `03-dependencies-and-versions` | middle | dependency resolution, holds, pinning | man7 `apt_preferences(5)` |
| 4 | `04-dnf-and-the-rhel-side` | middle | cross-distro `dnf`/`rpm` parallels | dnf.readthedocs.io, man7 `rpm(8)` |

### Task 4 — Unit `05-users-groups-pam` (order 5)

`lessons: ["01-passwd-and-shadow","02-permissions-deeper","03-sudo-and-privilege","04-pam-and-login"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-passwd-and-shadow` | junior | UID/GID, `/etc/passwd`, `/etc/shadow`, password hashing | man7 `passwd(5)`,`shadow(5)` |
| 2 | `02-permissions-deeper` | middle | setuid/setgid/sticky, umask, POSIX ACLs (beyond CLI's chmod) | man7 `chmod(2)`,`acl(5)` |
| 3 | `03-sudo-and-privilege` | middle | sudoers, escalation, root, least privilege | man7 `sudoers(5)` |
| 4 | `04-pam-and-login` | senior | PAM stack, the login flow, nsswitch | man7 `pam(8)`,`nsswitch.conf(5)` |

### Task 5 — Unit `06-filesystems-and-mounts` (order 6)

`lessons: ["01-block-devices-and-partitions","02-filesystems","03-mounting","04-fstab-and-boot-mounts"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-block-devices-and-partitions` | junior | `lsblk`, `/dev`, GPT vs MBR | man7 `lsblk(8)` |
| 2 | `02-filesystems` | middle | ext4/xfs/btrfs, inodes, `mkfs` | man7 `mkfs(8)`,`ext4(5)` |
| 3 | `03-mounting` | middle | `mount`/`umount`, bind mounts, mount options | man7 `mount(8)` |
| 4 | `04-fstab-and-boot-mounts` | middle | `fstab`, UUIDs, what breaks boot | man7 `fstab(5)` |

### Task 6 — Unit `07-storage-and-lvm` (order 7)

`lessons: ["01-why-lvm","02-growing-and-snapshots","03-raid-basics","04-disk-failure-and-recovery"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-why-lvm` | middle | PV/VG/LV abstraction vs raw partitions | man7 `lvm(8)` |
| 2 | `02-growing-and-snapshots` | senior | `lvextend`, `resize2fs`, snapshots | man7 `lvextend(8)` |
| 3 | `03-raid-basics` | senior | `mdadm`, RAID levels, vs LVM raid | man7 `mdadm(8)` |
| 4 | `04-disk-failure-and-recovery` | senior | degraded arrays, replacing a disk (use an `incident` practice task) | kernel.org md docs |

### Task 7 — Unit `08-processes-and-resources` (order 8)

`lessons: ["01-process-lifecycle","02-signals-deeper","03-cgroups-and-limits","04-the-oom-killer"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-process-lifecycle` | middle | fork/exec/wait, zombies, orphans, PID-ns preview | man7 `fork(2)`,`wait(2)` |
| 2 | `02-signals-deeper` | middle | SIGTERM vs SIGKILL, handlers, process groups | man7 `signal(7)` |
| 3 | `03-cgroups-and-limits` | senior | cgroups v2, cpu/memory limits, `ulimit`/rlimits | man7 `cgroups(7)`,`getrlimit(2)` |
| 4 | `04-the-oom-killer` | senior | OOM scoring, when/why it strikes, tuning (`incident` practice) | man7 `proc(5)`, kernel.org |

### Task 8 — Unit `09-networking` (order 9)

`lessons: ["01-interfaces-and-ip","02-routing","03-dns-resolution","04-firewalls-nftables"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-interfaces-and-ip` | middle | `ip addr`/`ip link`, the `ip` suite vs `ifconfig` | man7 `ip(8)` |
| 2 | `02-routing` | middle | `ip route`, routing table, default gateway | man7 `ip-route(8)` |
| 3 | `03-dns-resolution` | middle | `resolv.conf`, systemd-resolved, nsswitch, resolution path | man7 `resolv.conf(5)` |
| 4 | `04-firewalls-nftables` | senior | nftables, firewalld, netfilter hooks (→ security-defensive bridge) | man7 `nft(8)` |

### Task 9 — Unit `10-logs-and-journald` (order 10)

`lessons: ["01-journald","02-persistent-and-rotation","03-syslog-and-rsyslog","04-reading-a-failure"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-journald` | junior | the journal, `journalctl`, structured fields | freedesktop `journalctl(1)` |
| 2 | `02-persistent-and-rotation` | middle | persistent journal, vacuum, `logrotate` | man7 `logrotate(8)` |
| 3 | `03-syslog-and-rsyslog` | middle | syslog model, facilities/severities, forwarding | man7 `rsyslog.conf(5)`,`syslog(3)` |
| 4 | `04-reading-a-failure` | senior | debug a boot/service failure from logs (`incident` practice) | freedesktop `journalctl(1)` |

### Task 10 — Unit `11-scheduling` (order 11) — 3 lessons

`lessons: ["01-cron","02-systemd-timers","03-choosing-and-debugging"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-cron` | junior | `crontab`, `/etc/cron.d`, environment gotchas | man7 `crontab(5)`,`cron(8)` |
| 2 | `02-systemd-timers` | middle | `OnCalendar`, monotonic timers, vs cron | freedesktop `systemd.timer(5)` |
| 3 | `03-choosing-and-debugging` | senior | when to use which, why a job didn't run (`incident` practice) | freedesktop `systemd.timer(5)` |

### Task 11 — Unit `12-kernel-tuning` (order 12) — 3 lessons

`lessons: ["01-sysctl","02-modules","03-namespaces-and-cgroups-recap"]`

| order | slug | level | angle | source |
|---|---|---|---|---|
| 1 | `01-sysctl` | middle | kernel parameters, `/proc/sys`, persistent `sysctl.d` | man7 `sysctl(8)`,`sysctl.conf(5)` |
| 2 | `02-modules` | middle | `lsmod`/`modprobe`, module params, blacklisting | man7 `modprobe(8)`,`modules-load.d(5)` |
| 3 | `03-namespaces-and-cgroups-recap` | senior | container primitives, bridge to Docker | man7 `namespaces(7)`,`cgroups(7)` |

---

## Self-Review

- **Spec coverage:** every unit in spec §5 → a task (Task 0 = unit 01; Tasks 1–11 = units 02–12). All six seams → Task 0 Steps 1–6. Verify gate → Protocol P7. Practice contract → Global Constraints + P4. EN+RU parity → P2/P3.
- **Placeholder scan:** lesson prose is intentionally generative (the subagent authors it to the depth bar from the per-lesson angle + source) — this is the established repo pattern, not a placeholder. All structural payloads (seam edits, `units.json` entries, frontmatter key set, file paths, verify commands) are concrete.
- **Type consistency:** seam identifiers (`"linux"`, `"foundations"`, `"LIN"`, `color:"sky"`, `order:40`) are identical across Task 0 and the spec. `units.json` entry shape (`id/slug/track/order/title/crux/lessons`) matches `content.config.ts`. Practice field shapes match `content.config.ts` discriminated unions.
- **Gap check:** no spec requirement left without a task.
