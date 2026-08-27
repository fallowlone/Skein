# Pathfinding Route Engine — starter

Implement `MinHeap<T>`, `parseGrid`, `bfs`, `dijkstra`, and `astar` in `src/pathfind.ts`.

    bun test

Grid format: `.` = open (weight 1), `#` = wall, `2`–`9` = weighted cell.
4-directional movement. Each search returns `{ path, cost, expanded }`.

When the suite is green, read the project rubric and push to the senior bar:
bidirectional search, tie-breaking, performance on large grids, jump-point search.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Model the world as a graph** (`graph-model`)
2. **BFS and DFS: the uninformed pair** (`bfs-dfs`)
3. **Dijkstra: search that respects cost** (`dijkstra`)
4. **A*: aim with a heuristic** (`a-star`)
5. **One CLI, four searches, honest numbers** (`cli-and-compare`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

