# Homelab practice — design

> Sub-project 3 of the phased program (CLI → Linux → **Homelab** → patterns).
> CLI track shipped; Linux track deferred. This spec covers Homelab PRACTICE
> (not a new track): real-world devops/security practice tasks mined from the
> author's home server, distributed onto existing tracks + a capstone project.

## Goal

Turn the author's real home-server architecture (a VPN-gated media stack with a
kill-switch, three access rings, a host firewall, and a backup pipeline) into a
bank of senior-grade practice tasks on the existing curriculum, plus one capstone
project that ties them together. Every learner-facing value is SYNTHETIC — zero
real secrets, IPs, hostnames, or usernames.

## Source & sanitization (HARD RULE)

Source: an analysis report of the author's server. Real values NEVER appear in
content. Locked synthetic map:

| Real (source) | Synthetic (content) |
|---|---|
| `192.168.178.30`, `192.168.178.0/24` (Fritz!Box LAN) | `10.0.0.30`, `10.0.0.0/24` |
| Tailscale `100.125.77.93` | `100.64.0.30` (CGNAT doc range) |
| user `anonim` (uid 1001) | `operator` |
| host `home` | `nas01.example` |
| Mullvad (VPN provider) | "a commercial WireGuard VPN" (generic) |
| WireGuard/lampac secrets | never referenced (were excluded from source too) |

Docker default subnet `172.18.0.0/16` and standard service ports (8080/8096/9696
etc.) are generic and may stay. Any new IP uses doc ranges (192.0.2/198.51.100/
203.0.113/100.64). A build/review check greps the homelab tasks for the real
strings above and fails if any appear.

## Form (NOT a new track)

Practice JSON tasks appended to EXISTING lessons' practice files at their
`lessonKey`, respecting the ≤8-tasks-per-file cap, preserving existing tasks,
unique task ids, full EN+RU. Plus one new `projects` collection entry for the
capstone. No new track → none of the 6 track-seams are touched.

## Topic → lessonKey map (13 source ideas)

| Source idea | lessonKey (append practice) |
|---|---|
| 1. multi-service compose `depends_on`/`healthcheck` | `docker/06-compose-and-local-dev/02-dependencies-and-healthchecks` |
| 2. sidecar `network_mode: service:X` (shared netns) | `docker/03-networking/03-container-to-container` |
| 13. `nsenter` health-probe into another container's netns | `docker/09-debugging-containers/03-debugging-distroless` |
| 3. bind to a specific interface vs `0.0.0.0` (`ss -tulpn`) | `security-defensive/03-hardening-defense-in-depth/02-network-hardening` |
| 5. VPN kill-switch (traffic only via tunnel) | `security-defensive/03-hardening-defense-in-depth/02-network-hardening` |
| 6. `FIREWALL_OUTBOUND_SUBNETS` split-tunnel whitelist | `security-defensive/03-hardening-defense-in-depth/02-network-hardening` |
| 8. `ufw` enabled≠active + Docker bypassing ufw | `security-defensive/03-hardening-defense-in-depth/02-network-hardening` |
| 7. SSH hardening (key-only / no-root / fail2ban) | `security-defensive/03-hardening-defense-in-depth/01-os-and-host-hardening` |
| 9. unattended-upgrades trade-offs | `security-defensive/03-hardening-defense-in-depth/04-patch-and-vulnerability-management` |
| 4. three access rings localhost / LAN / overlay-VPN | `networking/11-network-security/06-defense-in-depth` |
| 10. mesh VPN → zero public surface | `security-foundations/04-network-security/04-dns-and-zero-trust` |
| 11. backup script: rotation + cron + log | `cli/10-putting-it-together/02-a-maintenance-script` |
| 12. `age` encryption of the backup | `cli/10-putting-it-together/02-a-maintenance-script` |

`age` and host-interface-binding have no dedicated lesson — the task explains the
concept inline (self-contained), since practice tasks already carry full
context/reveal. The `02-network-hardening` file gathers four homelab topics
(3,5,6,8) — it must stay within the ≤8-task cap; if the existing file already
holds many tasks, split across the adjacent `01`/`02` hardening lessons.

## Task types

`predict` (predict `ss -tulpn` output / what happens when the VPN drops),
`diagnose` (fill the `ufw allow` command / why `enabled`≠`active`),
`review` (planted security hole in a compose/firewall snippet — `planted:true`),
`design` (compose the kill-switch / 3-ring topology / backup script),
`incident` (multi-step: VPN-leak investigation; ufw enabled-but-inactive),
`sandbox` ONLY where synchronous JS models the rule honestly with a real
`stdout-equals` check: (a) backup keep-last-N rotation logic; (b) split-tunnel
routing decision (given a destination IP + `FIREWALL_OUTBOUND_SUBNETS` whitelist
→ "via VPN" vs "direct"). The shell/containers are never actually executed.

## Capstone

New `src/content/projects/homelab-secure-stack.json` (mirror
`projects/nextjs-app-to-production.json`):
`category:"infra"`, `difficulty:"advanced"`, `tracks:["docker","networking",
"security-defensive","cli"]`. `GuidedMilestone[]` (≥2) with `feedsFrom` pointing
at the enriched lessonKeys, each with `definitionOfDone` checklists; `pitch`,
`deliverable`, `skills`, `stack`, `seniorStretch` — all bilingual, all synthetic.
Brief: build a VPN-gated media stack (5 services sharing the VPN container's
netns via `network_mode: service:vpn`) with a kill-switch + split-tunnel
whitelist, three access rings (localhost/LAN/mesh-VPN), a `ufw` host firewall
(allow 22 before enable), SSH hardening, and a rotating encrypted backup.

## Out of scope

- The Linux track and patterns cluster (separate sub-projects).
- Any real home-server data (synthetic only, enforced by the grep check).
- A new `homelab` track (rejected — distribute + capstone per the program).
- Executing real shell/containers in-browser (architecturally unavailable).

## Self-review

- **Placeholders:** none — every task has a concrete lessonKey or an explicit
  "explain inline" note.
- **Consistency:** form (append practice + projects capstone), the synthetic
  map, and the type list agree throughout; no new-track seams touched.
- **Scope:** one sub-project; 13 tasks + 1 capstone, distributed onto ~9 existing
  lessonKeys across 4 tracks. Single implementation plan.
- **Ambiguity:** sanitization is explicit (locked table + grep gate); the ≤8-cap
  append rule is stated; sandbox honesty is constrained to two faithful models.
