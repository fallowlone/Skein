# Homelab practice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Ship homelab practice = 13 senior devops/security tasks appended to existing lessons' practice files across docker / security-defensive / security-foundations / networking / cli, plus one capstone `projects` entry. No new track. All values synthetic.

**Architecture:** CONTENT plan. Each task's "test cycle" = `bunx astro sync` + `bun scripts/lint-src.mjs` per increment; final gate = full `bun run build` + `bun run test` + `bun run verify:samples` + a sanitization grep. Spec: `docs/superpowers/specs/2026-06-21-homelab-practice-design.md`.

## Global Constraints

- **Sanitization (HARD).** Real values from the source server NEVER appear. Locked map: `192.168.178.x`→`10.0.0.x`; `192.168.178.0/24`→`10.0.0.0/24`; Tailscale `100.125.77.93`→`100.64.0.30`; user `anonim`→`operator`; host `home`→`nas01.example`; Mullvad→"a commercial WireGuard VPN". New IPs use doc ranges (192.0.2/198.51.100/203.0.113/100.64). Docker `172.18.0.0/16` + standard ports are generic, may stay. Task 6 greps for the real strings and FAILS if any appear.
- **Append, don't replace.** Each homelab task is ADDED to the EXISTING practice JSON at its lessonKey. READ the file first; keep every existing task untouched; total tasks per file ≤ 8 (schema cap); new task `id`s unique within the file (`^[a-z0-9-]+$`), prefixed `homelab-` for clarity. Full EN+RU on every field.
- **Task types** (fields per `src/content.config.ts`): `predict` (scenario+reveal), `diagnose` (grading.mode blanks|self — NOT scenario/reveal), `review` (diff + findings[].planted:true), `design` (constraints+rubric≥2+model), `incident` (steps 3–6), `sandbox` (runtime js, sync `setup` console.log + `expected.stdout-equals`). Sandbox ONLY for: backup keep-last-N rotation, and split-tunnel routing decision — value MUST equal actual setup output, synchronous only.
- **Do NOT touch** any track-seam files (types/index.ts, tracks.json, units.json, track-band.ts, track-meta.ts, mastery-field.ts) — no new track.
- Template practice files to read for shape: docker `practice/docker/06-compose-and-local-dev/02-dependencies-and-healthchecks.json`; sec-defensive `practice/security-defensive/03-hardening-defense-in-depth/02-network-hardening.json`; cli `practice/cli/10-putting-it-together/02-a-maintenance-script.json`; sandbox `practice/databases/07-sharding/05-hot-shard-failure.json`.
- Gate per task: `bunx astro sync` + `bun scripts/lint-src.mjs` clean.

---

### Task 1: Docker enrichment (3 lessonKeys)

Append homelab tasks to existing practice files:
- `docker/06-compose-and-local-dev/02-dependencies-and-healthchecks` — a `review` or `design`: multi-service compose where 5 services `depends_on: {vpn: condition: service_healthy}` + healthcheck on the VPN gateway (planted bug option: missing `condition: service_healthy` so services start before the tunnel is up).
- `docker/03-networking/03-container-to-container` — `predict`/`design`: the sidecar pattern `network_mode: "service:vpn"` (a container shares another's netns); predict what `ip addr` shows inside the sidecar.
- `docker/09-debugging-containers/03-debugging-distroless` — `diagnose`/`design`: use `nsenter -t <pid> -n` to enter a distroless/sidecar container's netns and run a probe (no shell in the container).

Respect the ≤8 cap per file (read first). **Gate:** sync+lint clean. **Commit:** `content(homelab): docker practice — compose healthcheck, sidecar netns, nsenter`.

---

### Task 2: security-defensive enrichment (3 files, topics 3/5/6/7/8/9)

- `…/01-os-and-host-hardening` — SSH hardening: `diagnose` (fill `sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`) + a `review` of a weak sshd config (planted: root login + password auth on).
- `…/02-network-hardening` — the dense one (keep ≤8 total incl. existing): (3) `predict` `ss -tulpn` — why `127.0.0.1:8080` ≠ `0.0.0.0:8080`; (8) an `incident` "ufw `enabled` but `inactive`" (systemctl is-enabled vs is-active) + the `allow 22` BEFORE `enable` lockout footgun + Docker bypassing ufw (DOCKER-USER chain); (5/6) a `sandbox` modelling the split-tunnel routing decision (dest IP + `FIREWALL_OUTBOUND_SUBNETS` whitelist → "direct (LAN/docker)" vs "via VPN"). If the existing file is already near the cap, move the SSH-binding `predict` to `01` and keep `02` to the firewall trio.
- `…/04-patch-and-vulnerability-management` — `design`/`review`: unattended-upgrades trade-offs (auto-patch vs unexpected restart/regression).

**Gate:** sync+lint clean. **Commit:** `content(homelab): security-defensive practice — ssh, ufw/kill-switch, patching`.

---

### Task 3: networking + security-foundations enrichment (2 files)

- `networking/11-network-security/06-defense-in-depth` — `design`: the three access rings (localhost / LAN / overlay-VPN) — place each of a set of services in the right ring; rubric checks the most sensitive stays localhost-only.
- `security-foundations/04-network-security/04-dns-and-zero-trust` — `review`/`design`: replace port-forwarding with a mesh/overlay VPN for "zero public surface" (planted option: exposing a port to the internet vs mesh-only).

**Gate:** sync+lint clean. **Commit:** `content(homelab): networking + sec-foundations practice — access rings, mesh-VPN`.

---

### Task 4: cli enrichment (1 file)

- `cli/10-putting-it-together/02-a-maintenance-script` — (11) a `sandbox` modelling backup keep-last-N rotation (given a sorted list of timestamped archives, keep the newest N, list deletions) with a real `stdout-equals`; (12) a `design`/`review` adding `age` encryption before off-site upload (explain `age` inline — it has no lesson). Respect ≤8 cap.

**Gate:** sync+lint clean. **Commit:** `content(homelab): cli practice — backup rotation sandbox + age encryption`.

---

### Task 5: Capstone project

Create `src/content/projects/homelab-secure-stack.json` (mirror `projects/nextjs-app-to-production.json`): `category:"infra"`, `difficulty:"advanced"`, `tracks:["docker","networking","security-defensive","cli"]`, `estDays`, `skills[]`, `stack[]`, `pitch/deliverable/title` bilingual, `seniorStretch[]` (≥1), `GuidedMilestone[]` (≥2) each with `id`, bilingual `title`/`goal`, `definitionOfDone[]`, and `feedsFrom` → the enriched lessonKeys from Tasks 1–4. Theme: VPN-gated media stack with kill-switch + split-tunnel + 3 access rings + ufw + SSH hardening + rotating encrypted backup. All synthetic.

**Gate:** sync+lint clean (validate against the projects schema). **Commit:** `content(homelab): capstone project homelab-secure-stack`.

---

### Task 6: Completeness pass

- [ ] Sanitization grep: confirm ZERO real strings (`192.168.178`, `100.125.77.93`, `anonim`, literal host `home`, `Mullvad`) across all new homelab tasks + the project. (Mullvad/host `home` may legitimately not appear; the grep is the gate.)
- [ ] Full gate: `bun run build` (lint clean, render OK), `bun run test` (all green — confirms projects schema + no regressions), `bun run verify:samples` (sandboxes pass).
- [ ] Confirm every appended file ≤8 tasks, unique ids, EN/RU parity on new tasks, all `review` findings `planted:true`, all sandbox `expected.value` = actual `setup` output.
- [ ] Commit any fixes `content(homelab): completeness pass`.

---

## Self-Review

- **Spec coverage:** 13 source ideas → concrete lessonKeys ✔; capstone projects entry ✔; sanitization locked + grep-gated ✔; append-not-replace + ≤8 cap ✔; sandbox honesty constrained ✔; bilingual ✔; no new-track seams ✔.
- **Lessons baked in (from CLI phases):** full `bun run build` + `bun run test` gate at completeness (lint:src never renders/MDX-compiles/schema-checks projects the same way); sandbox outputs exec-verified; no `\"`-in-attribute (practice is JSON, not MDX — but the capstone project is JSON too, so safe).
- **Scope:** one sub-project; ~9 existing files enriched + 1 new project. Single plan.
