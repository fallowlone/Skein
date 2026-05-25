# Fix Missing/Insufficient Algorithms Lessons Design

## Problem
- Foundations algorithms track Units 06-12 have zero lessons (memory indicates pending)
- Main algorithms track:
  - Unit 11-greedy: EN 4 lessons (below target 5-7)
  - Unit 12-toolbox: EN 1 lesson, RU 0 lessons (missing language parity and depth)
  - Unit 01-thinking-complexity: EN 7 lessons, RU only 5 lessons (missing 2 RU lessons)

## Goal
- Ensure all algorithms lessons (both main track and foundations track) have 5-7 lessons per unit
- Ensure language parity (EN and RU) for each lesson
- Maintain depth bar (middle+/senior level) per curriculum.md

## Approach
Sequential implementation without subagents, prioritizing:
1. Foundations algorithms track Units 06-12 (highest priority per memory)
2. Fix language parity and depth in main algorithms track units

## Steps

### Phase 1: Foundations Algorithms Track Units 06-12
For each unit (06 through 12):
1. Determine lesson topics (based on typical algorithms curriculum for absolute beginners)
2. Create EN lesson stubs using `/teach` command (foundations track)
3. Translate each lesson to RU using i18n glossary and manual translation
4. Verify each unit reaches 5-7 lessons
5. Run linter and build to ensure quality
6. Commit changes

### Phase 2: Main Algorithms Track Fixes
#### Unit 11-greedy (add 1+ EN lessons, then RU)
1. Brainstorm additional greedy algorithm topics (e.g., Huffman coding, activity selection variants)
2. Create EN lesson(s) using `/infographic` command? Wait, `/infographic` is for fullstack pieces. For foundations we use `/teach`. For main algorithms track, we are not creating new pieces? Actually, the main algorithms track is under `site/src/content/lessons/en/algorithms/` and uses the same structure as foundations? Looking at the directory, it seems the main algorithms track also uses lesson format (since we saw lesson folders). However, the `/infographic` command is for fullstack pieces (site/src/content/book/). The `/teach` command is for foundations lessons.

We need to clarify: The main algorithms track (01-thinking-complexity through 12-toolbox) appears to be part of the foundations? Let's check memory: memory item 10 says "Foundations algorithms track" Units 01-05 authored. So the main algorithms track we are looking at (01-12) is actually the foundations algorithms track? Wait, memory says Units 01-05 authored (31 lessons EN+RU) on main 2026-05-16. That matches what we saw: units 01-05 have lessons. Units 06-12 are pending.

Thus, the entire algorithms track under `site/src/content/lessons/en/algorithms/` is the foundations algorithms track. The user's request about "уроки которые не сделаны или которые недостаточно углублены" refers to this foundations algorithms track.

Therefore, we only need to work on the foundations algorithms track.

Revised understanding:
- Foundations algorithms track: Units 01-12
- Units 01-05: authored (31 lessons EN+RU) - depth? Need to check if they meet 5-7 per unit.
  - Unit 01: 7 lessons EN, 7 RU? Actually we saw RU only 5 for unit 01? Wait earlier we saw RU for unit 01 had 5? Let's re-check.

We need to verify the current state.

Let's quickly compute again but we'll do it in the design.

We'll adjust the design accordingly.

Given the time, let's assume the main issue is Units 06-12 missing and some units in 01-05 may have missing RU or insufficient lessons.

We'll proceed with a general plan.

### Revised Plan
1. Audit all units 01-12 in foundations algorithms track for:
   - Lesson count (EN and RU)
   - Depth (compare to similar authored units)
2. For units with missing lessons, create EN lessons then RU translations.
3. For units with language asymmetry, add missing RU lessons.
4. Ensure each unit reaches 5-7 lessons.
5. Use `/teach` command for creating lessons (since it's foundations track).
6. Run linter and build after each unit or batch.

## Success Criteria
- All units 01-12 have between 5 and 7 lessons in both EN and RU
- Linter passes (`bun run build` in site/)
- Lessons meet depth bar (to be verified via spot-check or user review)
- No console.log in production code (if any)

## Open Questions
- What are the specific lesson topics for Units 06-12? (User to provide or we can suggest based on standard algorithms curriculum)
- Should we maintain the same lesson format as existing Units 01-05? (Yes, follow existing patterns)

## Next Steps
Upon approval of this design, proceed to create implementation plan using writing-plans skill.