# Parallel expansion — launch & merge plan

5 isolated worktrees + branches are set up (one per track). Run a separate Claude Code
instance in each worktree. Each is fully isolated (own working tree, own node_modules,
own branch) so instances never collide.

## Recommended subset (given ~4h + 20% weekly tokens)
Do these well rather than all five thin: **Node, Nest, German** (top value: explicit
zero→senior ask + Germany/B1 goal). Add **ci-cd** and/or **aws** if budget remains.

## Worktrees (already created)
| Worktree | Branch | Prompt to paste |
|---|---|---|
| `../ae-node`    | `expand-node`    | `docs/superpowers/parallel-prompts/expand-node.md` |
| `../ae-nest`    | `expand-nest`    | `docs/superpowers/parallel-prompts/expand-nest.md` |
| `../ae-german`  | `expand-german`  | `docs/superpowers/parallel-prompts/expand-german.md` |
| `../ae-cicd`    | `expand-cicd`    | `docs/superpowers/parallel-prompts/expand-cicd.md` |
| `../ae-aws`     | `expand-aws`     | `docs/superpowers/parallel-prompts/expand-aws.md` |

## To launch each instance
```bash
cd ../ae-node            # (or ae-nest / ae-german / ae-cicd / ae-aws)
cd site && bun install   # once per worktree you actually use (separate node_modules)
cd ..
claude                   # start Claude Code here
```
Then paste into the instance: *"Read docs/superpowers/parallel-prompts/PROTOCOL.md and docs/superpowers/parallel-prompts/expand-<TRACK>.md, then execute the expansion. Build green on your branch, commit, do NOT merge or push."*

## Rules that keep it safe
- Each instance commits to ITS branch only. **Nobody merges to main or pushes** — the coordinator (the main session) merges.
- Instances never touch `types/index.ts`, `track-band.ts`, `track-meta.ts`, or another track.
- German instance also follows the German sub-design spec.

## Merge plan (coordinator does this after instances finish)
1. For each finished branch, sequentially: `git checkout main && git merge --no-ff expand-<track>` (or ff if linear). Branches touch disjoint files (different track dirs + append-only units.json), so conflicts should be limited to `units.json` (append regions) — resolve by keeping all appended unit objects.
2. After each merge, run `cd site && bun run build` once to confirm green before the next merge.
3. Final: full `bun run test` + `bun run build` green, then ONE push to main (triggers the CF deploy with everything).
4. `git worktree remove ../ae-<track>` for each, `git worktree prune`, delete merged branches.
