# Plan: Content Audit for Lessons (EN+RU)

## Context
User wants to find inaccuracies or incorrect translations across all topics in the `site/src/content/lessons` directory. With >1000 files, a systematic, batched audit is required to ensure quality and consistency without overloading context.

## Implementation Strategy

### 1. Mapping & Inventory
- Generate a complete list of all pieces in `site/src/content/lessons` for both `en` and `ru`.
- Identify missing translations (pieces present in EN but not RU, or vice versa).

### 2. Auditing Batches
Audit will be split into the following track-based batches to maintain focus and quality:
- **Batch 1 (Foundations):** `math`, `base-cs`, `algorithms`
- **Batch 2 (Core Backend):** `networking`, `apis`, `databases`, `backend`
- **Batch 3 (Infrastructure):** `distributed`, `queues`, `deployment`, `observability`, `security`
- **Batch 4 (Frontend & Perf):** `browser`, `frontend`, `performance`, `caching`
- **Batch 5 (Practice & AI):** `engineering-practice`, `ai-llm`, `data-engineering`

### 3. Audit Process (Per Piece)
For each pair of files:
1. **Translation Check:** Compare RU against EN. Check for:
   - Meaning preservation.
   - Natural flow (not machine-translated).
   - Adherence to `site/src/i18n/glossary.json`.
2. **Technical Accuracy:**
   - Verify technical facts.
   - Ensure examples/code snippets are consistent between languages.
   - Check if the content meets the "depth bar" for the target audience (senior fullstack).
3. **Consistency Check:**
   - Verify that links and cross-references are correct.
   - Ensure pedagogy widgets are correctly implemented and translated.

### 4. Reporting & Fixing
- Collect all identified issues into a report.
- Group issues by: `Critical (Incorrect fact)`, `Major (Bad translation)`, `Minor (Nit/Style)`.
- Fix issues in-place via `Edit` tool.

## Verification
- Final pass on fixed pieces to ensure no regressions.
- Run `bun run build` in `site/` to verify no linting or parse errors were introduced.
