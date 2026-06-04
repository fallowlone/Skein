# Node Encyclopedia + Mastery Lab — parallel launch & merge

Phase 0 (lab collection + lint rule + page + CTA + seed) is DONE on local `main` (commits `e8e0011b`, `931889f2`, `3fc94bad`). 6 worktrees are cut from that `main`, so each already has the Lab infra. Run a Claude Code instance per worktree.

## Worktrees / branches / prompts
| Worktree | Branch | Prompt |
|---|---|---|
| `../ae-net`   | `expand-node-net`  | `node-enc-net.md`  (unit 10-networking-deep) |
| `../ae-tls`   | `expand-node-tls`  | `node-enc-tls.md`  (unit 11-tls-and-http2) |
| `../ae-ffi`   | `expand-node-ffi`  | `node-enc-ffi.md`  (unit 12-native-and-ffi) |
| `../ae-mods`  | `expand-node-mods` | `node-enc-mods.md` (unit 13-modules-deep) |
| `../ae-v8`    | `expand-node-v8`   | `node-enc-v8.md`   (unit 14-v8-and-crypto) |
| `../ae-lab`   | `expand-node-lab`  | `node-enc-lab.md`  (fill the Lab challenges) |

## Launch each instance
```bash
cd ../ae-net            # (or ae-tls / ae-ffi / ae-mods / ae-v8 / ae-lab)
cd site && bun install  # once per worktree you actually run (separate node_modules)
cd .. && claude
```
Paste: *"Read docs/superpowers/parallel-prompts/PROTOCOL.md and docs/superpowers/parallel-prompts/node-enc-<X>.md, then execute. Build green on your branch, commit, do NOT merge or push."*

## Priority (if not running all 6)
Content value order: **v8, net, mods, lab, tls, ffi**. The Lab (`ae-lab`) is independent of the unit branches — it only touches `site/src/content/lab/node/*.json`, so it never conflicts with the others.

## Safety
- Only the coordinator (main session) merges/pushes. Instances commit to their branch only.
- Reviewers are READ-ONLY git: never checkout/reset/stash.
- The only file multiple unit branches touch is `site/src/content/units.json` (append orders 10–14). `ae-lab` does not touch it.

## Merge plan (coordinator)
1. Precompute `units.json` union across `main` + the 5 unit branches, dedup by `id` → `/tmp/units-union.json`.
2. `git checkout main`, `git merge --no-ff` each branch. On `units.json` conflict → `cp /tmp/units-union.json site/src/content/units.json && git add` then commit. `ae-lab` merges cleanly (disjoint files).
3. Full gate: `cd site && bun run test` + `bun run build` → tests pass, build `Complete!`, lint **0/0**, `dist/{en,ru}/learn/node/lab/index.html` exist.
4. ONE push to `main` (single CF deploy — carries Phase 0 + all content).
5. `git worktree remove --force` each, `git worktree prune`, `git branch -d` each merged branch.
