# Linux track — design spec

**Date:** 2026-06-21
**Status:** approved (brainstorming gate passed)
**Program context:** phased new-courses program **CLI → Linux → Homelab → patterns**.
CLI track (10 units / 36 lessons) and the Homelab practice cluster are already shipped to `main`.
Linux is the next sub-project. It is a content track; the already-shipped Homelab cluster is its
hands-on companion (no separate Lab/Drill/Project is authored for Linux).

---

## 1. Identity & intent

A new **linear `/teach`-style foundations track** named `linux`, mirroring the math / base-cs /
algorithms / cli skeleton: **Hook → Goal → Step → Visual → WorkedExample → Practice → Check → Recap**,
with optional collapsible `<Inset>` blocks for macOS / RHEL asides.

- **Audience / depth bar:** middle+ / senior fullstack engineer (per `CLAUDE.md`, `curriculum.md`).
  If a draft reads like `man`-page documentation, it is too shallow. It should read like an operator
  who has debugged the thing at 3am.
- **Two-tier** like CLI: Tier 1 is the beginner core (operate a Linux box); Tier 2 is senior
  (operate it under pressure — recovery, limits, tuning, incidents).
- **Distro lens:** **Debian/Ubuntu-first.** `apt` + `systemd` are the spine of every example.
  RHEL/Fedora (`dnf`, `firewalld`) appear as `<Inset>` asides where they materially differ; one
  lesson (`04-package-management/04-dnf-and-the-rhel-side`) makes the cross-distro bridge explicit.
  macOS appears as an `<Inset>` aside only where a concept has no Linux equivalent (BSD userland,
  no systemd, no procfs) — the reader's dev machine is macOS.
- **systemd is universal** (both Ubuntu and Fedora ship it); systemd-first is uncontroversial and
  legacy SysV is contrasted, not co-taught.
- **Builds on CLI** through ordering and narrative, **not** through the `prereqs` field. Per the
  lesson contract every lesson keeps `prereqs: []` and `mathPrereqs: []` (matches the CLI template,
  which builds clean). Lessons may *reference* CLI skills in prose ("you already pipe with `|` —
  now we pipe `journalctl` output") but declare no machine prereq edges.

### Boundary calls (what Linux owns vs. adjacent tracks)

| Topic | Linux owns | Deferred to |
|---|---|---|
| Permissions | setuid/setgid/sticky, umask, ACLs, PAM, sudoers | basic `chmod`/`chown` → `cli` 05 |
| Processes | lifecycle, signals deeper, cgroups v2, rlimits, OOM | `ps`/`kill`/job-control basics → `cli` 07 |
| Namespaces / cgroups | *previewed* as the container primitives (12-03) | full container model → `docker` |
| Networking | `ip`/`ss`, routing table, DNS path, nftables/firewalld mechanics | protocol theory → `networking`; threat-modeling/hardening posture → `security-defensive` |
| SSH | not re-taught | `cli` 09 |

---

## 2. The six registration seams (exact, all required)

Registering a new track touches **six** coupled seams. Seams 1–5 are TypeScript-enforced; **seam 6
is enforced ONLY by `bun run test`** (the exhaustiveness test in `mastery-field`). The CLI spec
itself listed only five and mislabeled `track-meta` as "the 6th wiring" — that undercount is the
exact trap this section corrects. Land the scaffold and unit 01 together — never register an empty track.

1. **`src/types/index.ts`** — add `"linux"` to BOTH the `Track` union AND the `TRACKS` array.
2. **`src/content/tracks.json`** — append the track entry. Shape is
   `{ slug, order, color, title{en,ru}, blurb{en,ru} }` (no `id` field):
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
3. **`src/content/units.json`** — append unit entries **incrementally, per unit** (each unit's entry
   lands in the same commit as that unit's lessons — matches how CLI registered units, and avoids a
   `units.json` entry referencing lesson slugs whose MDX does not yet exist). Each entry:
   `{ id: "linux/<NN-slug>", slug, track: "linux", order, title{en,ru}, crux{en,ru}, lessons:[...] }`.
   Merge is union-dedup-by-id. (Section 5 lists every unit's `crux` and `lessons` array.)
4. **`src/components/atlas/track-band.ts`** — `TRACK_BAND` add `"linux": "foundations"` (exhaustive `Record<Track,…>`).
5. **`src/scripts/track-meta.ts`** — `TRACK_ABBR` add `"linux": "LIN"` (exhaustive `Record<Track,…>`).
6. **`src/scripts/path/mastery-field.ts`** — add `"linux"` to the `foundations` family's `tracks`
   array in `DOMAIN_FAMILIES` (currently `["math","base-cs","cli","algorithms","logic"]` → add `"linux"`).
   **NOT TS-enforced**; only `bun run test` catches a miss.

---

## 3. Lesson contract (copy structure verbatim from the CLI template)

**Template:** `src/content/lessons/en/cli/03-streams-and-pipes/03-pipes-and-grep/index.mdx` (+ ru pair).

- **Path:** `src/content/lessons/{en,ru}/linux/<NN-unit>/<NN-lesson>/index.mdx`. Full EN+RU parity —
  every lesson exists under both `lessons/en/linux/` and `lessons/ru/linux/`.
- **Frontmatter keys** (exact set): `concepts`, `estMin`, `lang`, `lessonType: concept`, `level`
  (`zero`|`junior`|`middle`|`senior`), `mathPrereqs: []`, `order`, `prereqs: []`, `slug`, `sources`
  (real `man7.org` / `gnu.org` / `freedesktop.org` / `kernel.org` URLs, ≥1), `status: ready`,
  `summary` (≤280 chars, RU too — keep both well under 280, do not over-trim), `title`,
  `track: linux`, `unit: <NN-slug>`.
- **Imports use the `~/` alias, never `../`.** Standard import block:
  ```mdx
  import Hook from "~/components/lesson/Hook.astro";
  import Goal from "~/components/lesson/Goal.astro";
  import Step from "~/components/lesson/Step.astro";
  import WorkedExample from "~/components/lesson/WorkedExample.astro";
  import Check from "~/components/lesson/Check.astro";
  import Recap from "~/components/lesson/Recap.astro";
  import Inset from "~/components/lesson/Inset.astro";
  import FlowDiagram from "~/components/diagram/FlowDiagram.astro";
  import Quiz from "~/components/pedagogy/Quiz.astro";
  ```
- **EXACTLY ONE structural diagram per lesson** via `FlowDiagram` (NOT `StructureFigure` —
  `StructureFigure` takes `cells[]` and CRASHES the build if given `nodes`/`edges`):
  ```mdx
  <FlowDiagram
    label="… required aria description …"
    caption="… one-sentence caption …"
    nodes={[{ id: "x", label: "…", sub: "…" }]}
    edges={[{ from: "x", to: "y", label: "…" }]}
  />
  ```
- **`<Check>` holds a `<Quiz>`** with `id`, `pieceSlug` (= lesson slug), `lang`, `question`,
  `choices[]` (one `correct: true`, others carry `misconception`). **Quiz `id` identical across EN/RU.**
- **`<Inset>` kinds** used in the template: `kind="why"`, `kind="mistake"`. Use these for macOS /
  RHEL / SysV asides so the spine stays Debian/Ubuntu-clean.

### MDX hazards (hard-won — do not relearn)

- **Never** put backslash-escaped quotes (`\"`) inside a double-quoted JSX attribute
  (`caption="…\"x\"…"`) — JSX has no `\"` escape, the build crashes. Use a single-quote delimiter:
  `caption='…"x"…'`.
- No harness leakage: scan each authored file for `system-reminder`, `antml:`, `<function` before commit.
- `lint:src` does NOT render components, MDX-compile, or schema-check the way the build does. A wrong
  component prop, an MDX parse break, or the test-only 6th seam all PASS `lint:src` and only fail in
  the full build / test. The verify gate (Section 6) is mandatory.

---

## 4. Practice contract (shell is NOT executed)

- **One practice JSON per lesson** at `src/content/practice/linux/<NN-unit>/<NN-lesson>.json`.
- `lessonKey = "linux/<NN-unit>/<NN-lesson>"`, `track = "linux"`, `tasks[]` length **3–5** (≤8 cap).
- **Template:** `src/content/practice/cli/01-the-shell/03-where-am-i.json`. Field shapes in
  `src/content.config.ts`.
- **Type mix** (because shell output is never run): `predict` (scenario + reveal), `diagnose`
  (`grading.mode` = `blanks` | `self` — NOT scenario/reveal), `review` (diff + `findings[]`, each
  `planted: true`), `design` (constraints + `rubric` ≥2 + model), `incident` (`steps` 3–6).
- **`sandbox` ONLY** where synchronous JS *faithfully* models a rule with a real
  `expected: { kind: "stdout-equals", value: … }` check, and `value` equals the actual setup output.
  No async — QuickJS does not drain the Promise queue. Candidate sandboxes in this track: permission-bit
  / umask arithmetic, subnet/CIDR math, cgroup-limit arithmetic. Most lessons will have **no** sandbox.
- **Type-shape traps:** `diagnose` uses `grading.blanks` (or `grading.self`), never `scenario`/`reveal`
  (that is `predict`). Each `review` finding must be `planted: true`. `design` needs `rubric` length ≥2.
  `incident` needs 3–6 `steps`, each `{ label, prompt, reveal }`.

---

## 5. The 12-unit outline (46 lessons)

Each unit below gives its `units.json` `crux` (author EN + RU when writing the entry) and its lessons.
For every lesson: `slug` — angle (key `concepts`) — `level` — canonical source. Lesson prose is the
SDD subagent's job; this is the scope contract, not the script.

> Source convention: prefer `man7.org/linux/man-pages/...`, `www.freedesktop.org/software/systemd/man/...`,
> `www.gnu.org/...`, `www.kernel.org/doc/...`, `wiki.debian.org/...`. ≥1 real URL per lesson. Verify the
> URL resolves before committing — do not invent man-page section numbers.

### Tier 1 — beginner core (24 lessons)

**01-what-is-linux** — *crux:* "Linux" is a kernel plus a userland assembled by a distribution; the
kernel owns hardware and the syscall boundary, everything else is a file you can read.
1. `01-kernel-and-userland` — syscall boundary, ring 0 vs 3, kernel vs userspace — `junior` — man7 `syscalls(2)`
2. `02-distributions` — kernel + userland + package manager; Debian/Ubuntu/RHEL/Arch families — `junior` — wiki.debian.org
3. `03-filesystem-hierarchy` — FHS: `/etc /var /usr /proc /sys /dev`; everything-is-a-file — `junior` — man7 `hier(7)`
4. `04-proc-and-sys` — procfs/sysfs as live kernel windows — `junior` — man7 `proc(5)`

**02-boot-and-init** — *crux:* a Linux box boots firmware → bootloader → kernel → initramfs → PID 1,
and PID 1 (systemd) brings the system to a target; understanding the chain is how you fix a box that won't boot.
1. `01-the-boot-sequence` — firmware→bootloader→kernel→initramfs→PID1 — `junior` — man7 `boot(7)`, `bootup(7)`
2. `02-grub` — bootloader, kernel cmdline, recovery/single-user — `middle` — gnu.org grub manual
3. `03-pid1-and-init` — what init does, why PID 1 is special, systemd vs SysV — `middle` — freedesktop `systemd(1)`
4. `04-targets-and-runlevels` — `multi-user.target`, `isolate`, default target — `middle` — freedesktop `systemd.target(5)`

**03-systemd-and-services** — *crux:* systemd models the system as units with explicit dependencies;
`systemctl` is how you start, enable, and inspect them, and a unit file is how you make your own process a first-class service.
1. `01-units-and-systemctl` — unit types, `status/start/stop/enable` — `junior` — freedesktop `systemctl(1)`
2. `02-writing-a-service` — unit-file anatomy, `[Unit][Service][Install]`, `ExecStart`, `Restart=` — `middle` — freedesktop `systemd.service(5)`
3. `03-dependencies-and-ordering` — `Wants`/`Requires`/`After`/`Before`, target deps — `middle` — freedesktop `systemd.unit(5)`
4. `04-sockets-and-targets` — socket activation, custom targets — `senior` — freedesktop `systemd.socket(5)`

**04-package-management** — *crux:* a package manager turns "I want nginx" into a resolved, versioned,
removable set of files plus dependencies; `apt` is the front-end, `dpkg` is the engine, and every distro family has the same two layers.
1. `01-apt-and-repositories` — `apt`, `sources.list`, update vs upgrade, signing keys — `junior` — man7 `apt(8)`
2. `02-dpkg-internals` — `dpkg -i`, the package db, what a `.deb` contains — `middle` — man7 `dpkg(1)`
3. `03-dependencies-and-versions` — dependency resolution, holds, pinning — `middle` — man7 `apt_preferences(5)`
4. `04-dnf-and-the-rhel-side` — cross-distro: `dnf`/`rpm` parallels — `middle` — dnf.readthedocs.io / man7 `rpm(8)`

**05-users-groups-pam** — *crux:* identity on Linux is UID/GID in `passwd`/`shadow`; permission bits go
beyond `rwx` (setuid, sticky, ACLs); `sudo` and PAM are the policy layer that decides who may become whom.
1. `01-passwd-and-shadow` — UID/GID, `/etc/passwd`, `/etc/shadow`, password hashing — `junior` — man7 `passwd(5)`, `shadow(5)`
2. `02-permissions-deeper` — setuid/setgid/sticky, umask, POSIX ACLs — `middle` — man7 `chmod(2)`, `acl(5)`
3. `03-sudo-and-privilege` — sudoers, escalation, root, least privilege — `middle` — man7 `sudoers(5)`
4. `04-pam-and-login` — PAM stack, the login flow, nsswitch — `senior` — man7 `pam(8)`, `nsswitch.conf(5)`

**06-filesystems-and-mounts** — *crux:* a block device holds a filesystem; mounting grafts that
filesystem into the single tree at a path; `fstab` makes mounts survive a reboot, and a bad `fstab` line is a classic boot-killer.
1. `01-block-devices-and-partitions` — `lsblk`, `/dev`, GPT vs MBR — `junior` — man7 `lsblk(8)`
2. `02-filesystems` — ext4/xfs/btrfs, inodes, `mkfs` — `middle` — man7 `mkfs(8)`, `ext4(5)`
3. `03-mounting` — `mount`/`umount`, bind mounts, mount options — `middle` — man7 `mount(8)`
4. `04-fstab-and-boot-mounts` — `fstab`, UUIDs, what breaks boot — `middle` — man7 `fstab(5)`

### Tier 2 — senior (22 lessons)

**07-storage-and-lvm** — *crux:* LVM inserts a layer between disks and filesystems so you can grow,
snapshot, and span volumes without repartitioning; RAID adds redundancy — and the senior skill is recovering a degraded array without losing data.
1. `01-why-lvm` — PV/VG/LV abstraction vs raw partitions — `middle` — man7 `lvm(8)`
2. `02-growing-and-snapshots` — `lvextend`, `resize2fs`, snapshots — `senior` — man7 `lvextend(8)`
3. `03-raid-basics` — `mdadm`, RAID levels, vs LVM raid — `senior` — man7 `mdadm(8)`
4. `04-disk-failure-and-recovery` — degraded arrays, replacing a disk *(incident)* — `senior` — kernel.org md docs

**08-processes-and-resources** — *crux:* a process is a fork/exec lineage the kernel schedules and
accounts; signals are how you talk to it, cgroups and rlimits are how you cap it, and the OOM killer is what happens when you don't.
1. `01-process-lifecycle` — fork/exec/wait, zombies, orphans, PID-ns preview — `middle` — man7 `fork(2)`, `wait(2)`
2. `02-signals-deeper` — SIGTERM vs SIGKILL, handlers, process groups — `middle` — man7 `signal(7)`
3. `03-cgroups-and-limits` — cgroups v2, cpu/memory limits, `ulimit`/rlimits — `senior` — man7 `cgroups(7)`, `getrlimit(2)`
4. `04-the-oom-killer` — OOM scoring, when/why it strikes, tuning *(incident)* — `senior` — man7 `proc(5)` (oom_score), kernel.org

**09-networking** — *crux:* the host's network is interfaces, a routing table, and a name-resolution
path; the modern `ip`/`ss` suite inspects them, and nftables/firewalld is the kernel's packet-filter you configure — protocol theory lives in the networking track.
1. `01-interfaces-and-ip` — `ip addr`/`ip link`, the `ip` suite vs `ifconfig` — `middle` — man7 `ip(8)`
2. `02-routing` — `ip route`, the routing table, default gateway — `middle` — man7 `ip-route(8)`
3. `03-dns-resolution` — `resolv.conf`, systemd-resolved, nsswitch, the resolution path — `middle` — man7 `resolv.conf(5)`
4. `04-firewalls-nftables` — nftables, firewalld, netfilter hooks *(→ security-defensive bridge)* — `senior` — man7 `nft(8)`

**10-logs-and-journald** — *crux:* journald is the system's structured log store; `journalctl` queries
it by unit, time, and priority; persistent journals and logrotate keep history bounded — and reading a failure backwards from the logs is the core operator skill.
1. `01-journald` — the journal, `journalctl`, structured fields — `junior` — freedesktop `journalctl(1)`
2. `02-persistent-and-rotation` — persistent journal, vacuum, `logrotate` for files — `middle` — man7 `logrotate(8)`
3. `03-syslog-and-rsyslog` — the syslog model, facilities/severities, forwarding — `middle` — man7 `rsyslog.conf(5)`, `syslog(3)`
4. `04-reading-a-failure` — debugging a boot/service failure from logs *(incident)* — `senior` — freedesktop `journalctl(1)`

**11-scheduling** — *crux:* recurring work runs under cron or systemd timers; cron is the portable
classic, timers are the systemd-native option with better logging and dependency handling, and "why didn't my job run?" is a debugging skill of its own.
1. `01-cron` — `crontab`, `/etc/cron.d`, environment gotchas — `junior` — man7 `crontab(5)`, `cron(8)`
2. `02-systemd-timers` — `OnCalendar`, monotonic timers, vs cron — `middle` — freedesktop `systemd.timer(5)`
3. `03-choosing-and-debugging` — when to use which, why a job didn't run *(incident)* — `senior` — freedesktop `systemd.timer(5)`

**12-kernel-tuning** — *crux:* the kernel exposes thousands of tunables through sysctl and loads
hardware/feature support as modules; namespaces and cgroups are the same primitives containers are built from — which is exactly where the Docker track picks up.
1. `01-sysctl` — kernel parameters, `/proc/sys`, persistent `sysctl.d` — `middle` — man7 `sysctl(8)`, `sysctl.conf(5)`
2. `02-modules` — `lsmod`/`modprobe`, module params, blacklisting — `middle` — man7 `modprobe(8)`, `modules-load.d(5)`
3. `03-namespaces-and-cgroups-recap` — the container primitives, bridge to Docker — `senior` — man7 `namespaces(7)`, `cgroups(7)`

---

## 6. Verify gate (mandatory before declaring any unit done)

Run from `site/`:

1. `bun run build` — full Astro build + linter (renders + MDX-compiles + schema-checks; ~45–60 min,
   ~5800 pages — run in the background, gate on exit, don't poll).
2. `bun run test` — catches the **test-only 6th seam** (`mastery-field` exhaustiveness) and schema mirrors.
3. `bun run verify:samples` — only strictly required if a `run`-tagged code sample is added (this track
   ships none by default; still run it as the final gate).

`sync` + `lint:src` alone is **insufficient** — it does not render components, MDX-compile, or schema-check.

Per-unit, before commit, additionally scan authored files for:
- harness leakage: `system-reminder`, `antml:`, `<function`
- the `\"`-inside-double-quoted-JSX-attribute hazard
- `diagnose` tasks mis-typed as `scenario`/`reveal`; over-trimmed summaries; missing `planted: true`

---

## 7. Build order (SDD)

1. **Commit 1 — scaffold + unit 01 vertical slice:** the five TS seams (types, tracks.json, track-band,
   track-meta, mastery-field) + the **unit-01 `units.json` entry only** + `01-what-is-linux`
   (4 lessons EN+RU + 4 practice JSON). This validates all wiring end-to-end before bulk authoring.
   Verify gate. `git push`.
2. **Commits 2–12 — one SDD implementer subagent per remaining unit (02…12):** that unit's `units.json`
   entry + EN+RU lessons + practice JSON. Controller self-reviews content (depth bar, parity, MDX
   hazards, practice type-shapes), runs the verify gate, commits `content(linux): <NN-unit> EN+RU ready`,
   pushes. Units are registered in `units.json` incrementally so no entry ever references an absent lesson.
3. **Ledger:** `.superpowers/sdd/progress.md` tracks per-unit status (pending / authoring / verified / pushed).

---

## 8. Self-review

- **Placeholders:** none — every unit, lesson angle, level, and source family is concrete.
- **Consistency:** two-tier model (01–06 core / 07–12 senior), Debian/Ubuntu-first lens, the six seams,
  and the no-prereq-edges rule agree throughout. `foundations` band/family used in both seam 4 and 6.
- **Scope:** one track; commit 1 is a deliberate vertical slice (scaffold + unit 01) before bulk units.
- **Ambiguity:** practice cannot run a real shell — stated explicitly; `sandbox` is fenced to synchronous
  JS that models a rule, never faked execution. Units.json registration resolved to incremental-per-unit.
- **Out of scope:** the Homelab and patterns sub-projects (own specs); real home-server data; in-browser
  shell execution.
