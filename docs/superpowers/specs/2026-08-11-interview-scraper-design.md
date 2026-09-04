---
name: interview-scraper-design
description: Design for scraping and storing interview questions from ITLead.
metadata:
  type: project
---

# Interview Questions Scraper Design

## Overview
A web scraper built with Playwright to extract interview questions and answers from `https://itlead.org/en/interview-questions` and store them in a structured JSON format for use in the curriculum site.

## Architecture
- **Tooling**: Node.js script using Playwright for robust web crawling.
- **Location**: `site/scripts/scrape-interview-questions.ts`.
- **Output**: JSON collection in `site/src/content/interview/questions.json`.
- **Execution**: Manual invocation via `bun run scripts/scrape-interview-questions.ts`.

## Data Schema
```json
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "answer": "Answer text",
      "tags": ["category"]
    }
  ]
}
```

## Implementation Plan
1. Setup Playwright dependencies.
2. Develop scraper to crawl the target URL.
3. Parse and sanitize question-answer pairs.
4. Save to target JSON file.
5. Validate format for consistency.
