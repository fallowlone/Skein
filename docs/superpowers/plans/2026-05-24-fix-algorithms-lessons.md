# Fix Algorithms Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure all lessons in the foundations algorithms track (units 01-12) have 5-7 lessons per unit in both English and Russian, meeting the depth bar.

**Approach:** Sequentially process each unit with missing lessons, creating missing lessons via the `/teach` command, then verify counts and run linter/build.

**Tech Stack:** Bash, `/teach` command, bun (for linter and build)

---

### Task 1: Add missing lessons to unit 00-orientation

**Files:**
- Create: `site/src/content/lessons/en/algorithms/00-orientation/01-what-is-an-algorithm/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/00-orientation/01-what-is-an-algorithm/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/00-orientation/02-pseudocode/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/00-orientation/02-pseudocode/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/00-orientation/03-complexity/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/00-orientation/03-complexity/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/00-orientation/04-problem-analysis/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/00-orientation/04-problem-analysis/index.mdx`

- [ ] **Step 1: Create EN lesson "what-is-an-algorithm"**

Run: `/teach algorithms/00-orientation/01-what-is-an-algorithm`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 2: Create EN lesson "pseudocode"**

Run: `/teach algorithms/00-orientation/02-pseudocode`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 3: Create EN lesson "complexity"**

Run: `/teach algorithms/00-orientation/03-complexity`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 4: Create EN lesson "problem-analysis"**

Run: `/teach algorithms/00-orientation/04-problem-analysis`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 5: Verify lesson counts for unit 00-orientation**

Run: `find site/src/content/lessons/en/algorithms/00-orientation -name "index.mdx" -type f | wc -l`

Expected: 5

Run: `find site/src/content/lessons/ru/algorithms/00-orientation -name "index.mdx" -type f | wc -l`

Expected: 5

- [ ] **Step 6: Run linter and build**

Run: `cd site && bun run build`

Expected: Linter passes, build succeeds, output shows 301 pages (or similar) and lint clean.

- [ ] **Step 7: Commit**

```bash
git add site/src/content/lessons/en/algorithms/00-orientation/ site/src/content/lessons/ru/algorithms/00-orientation/
git commit -m "content(algorithms): 00-orientation EN+RU lessons added (4 lessons)"
```

### Task 2: Add missing lesson to unit 11-greedy

**Files:**
- Create: `site/src/content/lessons/en/algorithms/11-greedy/05-huffman-coding/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/11-greedy/05-huffman-coding/index.mdx`

- [ ] **Step 1: Create EN lesson "huffman-coding"**

Run: `/teach algorithms/11-greedy/05-huffman-coding`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 2: Verify lesson counts for unit 11-greedy**

Run: `find site/src/content/lessons/en/algorithms/11-greedy -name "index.mdx" -type f | wc -l`

Expected: 5

Run: `find site/src/content/lessons/ru/algorithms/11-greedy -name "index.mdx" -type f | wc -l`

Expected: 5

- [ ] **Step 3: Run linter and build**

Run: `cd site && bun run build`

Expected: Linter passes, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add site/src/content/lessons/en/algorithms/11-greedy/ site/src/content/lessons/ru/algorithms/11-greedy/
git commit -m "content(algorithms): 11-greedy EN+RU lesson added (huffman coding)"
```

### Task 3: Add missing lessons to unit 12-toolbox

**Files:**
- Create: `site/src/content/lessons/en/algorithms/12-toolbox/02-bitwise-operations/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/12-toolbox/02-bitwise-operations/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/12-toolbox/03-matrices/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/12-toolbox/03-matrices/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/12-toolbox/04-fast-bit-reversal/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/12-toolbox/04-fast-bit-reversal/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/12-toolbox/05-permutations/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/12-toolbox/05-permutations/index.mdx`
- Create: `site/src/content/lessons/en/algorithms/12-toolbox/06-sliding-window/index.mdx`
- Create: `site/src/content/lessons/ru/algorithms/12-toolbox/06-sliding-window/index.mdx`

- [ ] **Step 1: Create EN lesson "bitwise-operations"**

Run: `/teach algorithms/12-toolbox/02-bitwise-operations`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 2: Create EN lesson "matrices"**

Run: `/teach algorithms/12-toolbox/03-matrices`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 3: Create EN lesson "fast-bit-reversal"**

Run: `/teach algorithms/12-toolbox/04-fast-bit-reversal`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 4: Create EN lesson "permutations"**

Run: `/teach algorithms/12-toolbox/05-permutations`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 5: Create EN lesson "sliding-window"**

Run: `/teach algorithms/12-toolbox/06-sliding-window`

Expected output: Success message indicating lesson created in both EN and RU.

- [ ] **Step 6: Verify lesson counts for unit 12-toolbox**

Run: `find site/src/content/lessons/en/algorithms/12-toolbox -name "index.mdx" -type f | wc -l`

Expected: 6 (original 1 + 5 new)

Run: `find site/src/content/lessons/ru/algorithms/12-toolbox -name "index.mdx" -type f | wc -l`

Expected: 5 (original 0 + 5 new)

- [ ] **Step 7: Run linter and build**

Run: `cd site && bun run build`

Expected: Linter passes, build succeeds.

- [ ] **Step 8: Commit**

```bash
git add site/src/content/lessons/en/algorithms/12-toolbox/ site/src/content/lessons/ru/algorithms/12-toolbox/
git commit -m "content(algorithms): 12-toolbox EN+RU lessons added (5 lessons)"
```
