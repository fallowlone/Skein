# Homelab secure stack — starter

This workbench grades **your network plan**, so the review needs no access to your
hardware.

1. Write the plan in `artifact/network-plan.json`: segments, the firewall rules
   between them, what you expose, and how it is backed up and patched.
2. Run the checks:

       bun test

`src/network.ts` is the grader; you do not edit it. What ships in `artifact/` is the
homelab most people actually have: one flat network, an `any → any` rule, a NAS web UI
port-forwarded behind basic auth over plain HTTP, a camera with no auth at all, a
backup disk on the desk, and manual updates.

The checks follow one through-line: **a flat network is one compromised device away
from total loss, and the device most likely to be compromised is the one you cannot
patch** — the camera, the TV, the bulb. So:

- Management, trusted and IoT are separate segments, with distinct VLANs.
- IoT may not reach trusted/management/storage; guests get the internet, not your LAN.
- An `any → any` allow makes every other rule decoration; an any-port rule needs a
  written reason, because a rule nobody can justify gets removed by nobody.
- An internet-exposed service needs TLS, real authentication, and a DMZ to live in.
- Backups go offsite and the **restore has been tested** — an untested backup is a hope.

Green suite = the design is defensible. Then build it: apply the VLANs and rules, try
to reach the LAN from the IoT network and fail, and actually restore a file.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Compose the VPN-gated stack** (`compose-the-vpn-gated-stack`)
2. **Lock the network: kill-switch, split-tunnel, and ufw rings** (`lock-the-network`)
3. **Harden the host: SSH, fail2ban, and automatic patches** (`harden-the-host`)
4. **Remote access without a public surface** (`remote-without-public-surface`)
5. **Rotating, age-encrypted off-site backup** (`rotating-encrypted-backup`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

