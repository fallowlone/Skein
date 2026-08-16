# Interview answers implementation

## What was added

- Updated the interview question bank at `/en/interview-qa/` and `/ru/interview-qa/`.
- Kept all 564 questions across 18 categories.
- Added expandable full answers for every question.
- Added Junior, Middle, and Senior answer-level controls. Each level currently shows the complete source answer so no explanation, example, code sample, trade-off, mistake, or follow-up is hidden.

## Answer rendering improvements

- Added a parser for the scraped ITLead answer format.
- Converts scraped section separators into visual rules.
- Converts recognized sections into headings.
- Joins broken inline fragments such as `Daemon ( dockerd )` into readable prose.
- Groups code snippets into language-labelled code panels.
- Keeps explanatory prose outside code blocks.
- Renders answer content only after a question is expanded to reduce initial page cost.

## Files

- `src/components/interview/InterviewQABank.tsx` — question list, level selector, lazy answer rendering.
- `src/scripts/interview/interview-answers.ts` — answer-level model and scraper-output formatter.
- `src/scripts/interview/interview-answers.test.ts` — formatter, coverage, and dataset tests.
- `src/styles/global.css` — answer, code-panel, heading, and separator styles.
- `src/types/interview.ts` — interview level type.
- `src/i18n/ui.json` — English and Russian labels.

## Validation

- Interview answer tests: 5 passed.
- Dataset coverage: 564 questions have non-empty answers.
- `git diff --check`: passed.
- Local development server: `http://127.0.0.1:4321/`.

## Commit

This change is committed locally and has not been pushed.
