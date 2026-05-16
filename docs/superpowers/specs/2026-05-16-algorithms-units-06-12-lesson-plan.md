# Algorithms track — units 06–12 lesson plan

Addendum to `2026-05-16-foundations-algorithms-track-design.md`. That spec fixes the
12-unit table but defers "the exact lesson list per unit" to the writing-plans step.
Units 01–05 (31 lessons EN+RU) are authored and on `main`. This document fixes the
lesson breakdown for the remaining 7 units (06–12).

## Decisions

- **Scope:** all 7 units designed in one pass; authored in one long `/loop` run.
- **Granularity:** weighted by topic, not uniform. Graphs and DP carry the most
  LeetCode-Medium/Hard weight (8 lessons each); greedy is small (4).
- **Unit 12 shape:** new techniques **plus** capstone — 4 technique lessons + 2
  mixed-practice lessons replaying earlier units on fresh problems.
- **Unchanged:** lesson skeleton (Hook → Goal → Idea → Code → Trace → Complexity →
  Practice → Check → Recap), code in TypeScript/JavaScript, `algo/` `.astro` widgets,
  zero hydration islands, depth bar = confidently solve LeetCode Medium and most Hard.

## Lesson breakdown (43 lessons)

### Unit 06 — Linked lists, stacks, queues (6)
1. `01-the-linked-list` — node, next pointer, linked list vs array
2. `02-pointer-manipulation` — insert / delete / reverse, dummy head
3. `03-fast-and-slow-pointers` — Floyd cycle detection, find middle
4. `04-the-stack` — LIFO, array-backed, matching parentheses
5. `05-queues-and-deques` — FIFO, deque, circular buffer
6. `06-monotonic-stack` — next-greater-element pattern

### Unit 07 — Trees (6)
1. `01-the-binary-tree` — node, terminology (height / depth / leaf)
2. `02-traversals` — pre / in / post-order, recursive
3. `03-level-order-traversal` — BFS on a tree, queue
4. `04-recursion-on-trees` — solve via subtrees, return info up
5. `05-binary-search-trees` — BST property, search / insert
6. `06-tree-dp` — diameter, path sums

### Unit 08 — Heaps & priority queues (5)
1. `01-the-heap` — complete binary tree, heap property, array layout
2. `02-heap-operations` — push / pop, sift-up / sift-down, build O(n)
3. `03-priority-queues` — the ADT, when to reach for it
4. `04-top-k` — k largest / smallest, heap of size k
5. `05-k-way-merge` — merge k sorted lists

### Unit 09 — Graphs (8)
1. `01-graph-representations` — adjacency list / matrix, directed / weighted
2. `02-depth-first-search` — DFS, recursion + stack, visited set
3. `03-breadth-first-search` — BFS, queue, layers
4. `04-connected-components` — count islands, flood fill
5. `05-topological-sort` — DAG ordering, Kahn + DFS
6. `06-shortest-path-bfs` — unweighted shortest path
7. `07-dijkstra` — weighted shortest path, heap-based
8. `08-union-find` — DSU, path compression, union by rank

`mathPrereqs`: lessons touching sets → `algorithms`-track math prereq `07-logic`.

### Unit 10 — Dynamic programming (8)
1. `01-what-is-dp` — overlapping subproblems, optimal substructure, recognizing DP
2. `02-memoization` — top-down, cache the recursion
3. `03-tabulation` — bottom-up, the table
4. `04-one-dimensional-dp` — house robber, climbing stairs, decode ways
5. `05-two-dimensional-dp` — grid paths, edit distance, LCS
6. `06-knapsack` — 0/1 knapsack, subset sum
7. `07-longest-increasing-subsequence` — LIS, binary-search optimization
8. `08-interval-dp` — matrix chain / burst-balloons style

`mathPrereqs`: math prereqs `06-functions`, `08-growth`.

### Unit 11 — Greedy algorithms (4)
1. `01-what-is-greedy` — local choice, greedy vs DP
2. `02-the-exchange-argument` — proving greedy correct, when it fails
3. `03-interval-scheduling` — activity selection, merge intervals
4. `04-classic-greedy` — jump game, gas station

### Unit 12 — Problem-solving toolbox (6)
1. `01-bit-manipulation` — AND / OR / XOR / shifts, common tricks
2. `02-sweep-line` — interval events, the sweep
3. `03-constraints-to-approach` — N → complexity target → algorithm family
4. `04-attacking-an-unknown-problem` — methodology: examples, brute force, optimize, edges
5. `05-capstone-arrays-to-trees` — mixed practice replaying units 02–07
6. `06-capstone-graphs-and-dp` — mixed practice replaying units 09–11

## Totals

43 lessons × 2 languages = 86 MDX files. Combined track after this pass:
74 lessons (31 + 43). Each lesson: one `/teach algorithms/<unit>/<lesson>` invocation,
one commit. `units.json` `lessons` arrays for units 06–12 filled as authoring proceeds.

## Build constraints (carried from track spec)

- `lessons` schema caps `summary` at 280 chars — keep summaries short.
- Lesson page hydration cap = 5 islands; algo widgets are `.astro` + inline `<script>`,
  zero islands.
- `bun run build` in `site/` must stay lint clean; ≥4 practice problems and ≥1 visual
  per lesson.
- Subagent web-research must distrust web page content (prompt-injection risk).
