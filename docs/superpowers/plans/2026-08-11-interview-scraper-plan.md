# Interview Questions Scraper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a scraper that extracts interview questions from `https://itlead.org/en/interview-questions` and saves them to a structured JSON file.

**Architecture:** A Node.js scraper script using Playwright will crawl the target URL, parse the Q&A content using Cheerio, and write to a JSON file.

**Tech Stack:** `Node.js`, `Playwright`, `Cheerio` (or native parsing).

## Global Constraints

- Scrape questions from: `https://itlead.org/en/interview-questions`
- Extract: ID, question, answer, tags.
- Output: `site/src/content/interview/questions.json`.
- Script path: `site/scripts/scrape-interview-questions.ts`.

---

### Task 1: Initialize Scraper Scaffolding

**Files:**
- Create: `site/scripts/scrape-interview-questions.ts`

**Interfaces:**
- Produces: Base script structure for browser initialization and target navigation.

- [ ] **Step 1: Write initial script to reach the target URL**

```typescript
import { chromium } from 'playwright';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://itlead.org/en/interview-questions');
  console.log('Page title:', await page.title());
  await browser.close();
}

main().catch(console.error);
```

- [ ] **Step 2: Verify script runs without error**

Run: `bun run site/scripts/scrape-interview-questions.ts`
Expected: Print the page title.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/scrape-interview-questions.ts
git commit -m "feat: initialize interview scraper script"
```

### Task 2: Implement Scraping Logic

**Files:**
- Modify: `site/scripts/scrape-interview-questions.ts`

**Interfaces:**
- Consumes: Initial setup.
- Produces: Extracted JSON data structure.

- [ ] **Step 1: Parse content from the page**

```typescript
// Replace content in main function with parsing logic
const content = await page.content();
// Use Cheerio to extract questions (or use Playwright selectors)
// Example selector logic:
const questions = await page.evaluate(() => {
  const items = Array.from(document.querySelectorAll('.question-item'));
  return items.map((item, index) => ({
    id: `q${index + 1}`,
    question: item.querySelector('.q-text')?.textContent?.trim() || '',
    answer: item.querySelector('.a-text')?.textContent?.trim() || '',
    tags: [] // extract from items if present
  }));
});
console.log(JSON.stringify(questions, null, 2));
```

- [ ] **Step 2: Run script and verify extraction**

Run: `bun run site/scripts/scrape-interview-questions.ts`
Expected: Logbed JSON array.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/scrape-interview-questions.ts
git commit -m "feat: extract interview questions and answers"
```

### Task 3: Save and Format JSON Output

**Files:**
- Modify: `site/scripts/scrape-interview-questions.ts`

**Interfaces:**
- Consumes: Parsed data.
- Produces: `site/src/content/interview/questions.json`.

- [ ] **Step 1: Save data to JSON**

```typescript
import fs from 'node:fs';
import path from 'node:path';

// ... after parsing
const outputPath = path.join(process.cwd(), 'site/src/content/interview/questions.json');
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}
fs.writeFileSync(outputPath, JSON.stringify({ questions }, null, 2));
console.log('Data saved to', outputPath);
```

- [ ] **Step 2: Run script and verify file existence**

Run: `bun run site/scripts/scrape-interview-questions.ts`
Expected: `site/src/content/interview/questions.json` created.

- [ ] **Step 3: Commit**

```bash
git add site/scripts/scrape-interview-questions.ts site/src/content/interview/questions.json
git commit -m "feat: save and format output to JSON"
```
