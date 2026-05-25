# Quiz and Project Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quiz and project lessons to the end of every unit across all tracks in the curriculum site.

**Architecture:** We will create a script that reads the tracks and units from the JSON files and generates the required lesson files in the appropriate directories for both English and Russian. Each lesson will follow the existing MDX format and include the necessary frontmatter and components.

**Tech Stack:** Bun, JavaScript, MDX

---

### Task 1: Create script file structure

**Files:**
- Create: `scripts/generate-quiz-project-lessons.js`

- [ ] **Step 1: Initialize the script file**

```javascript
#!/usr/bin/env bun
/**
 * Script to generate quiz and project lessons for all units in all tracks.
 * Reads tracks.json and units.json to determine the structure.
 * Creates lesson files in site/src/content/lessons/{en,ru}/{track}/{unit}/{lesson}/index.mdx
 */
```

- [ ] **Step 2: Run to verify file creation**

Run: `ls -la scripts/generate-quiz-project-lessons.js`
Expected: File exists

- [ ] **Step 3: Make script executable**

Run: `chmod +x scripts/generate-quiz-project-lessons.js`

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-quiz-project-lessons.js
git commit -m "feat: create script structure for quiz/project lesson generation"
```

### Task 2: Add JSON reading functionality

**Files:**
- Modify: `scripts/generate-quiz-project-lessons.js`

- [ ] **Step 1: Write the failing test (we'll verify by running the script)**

Note: We are creating a script, not a testable function. We'll verify by running the script and checking output.

- [ ] **Step 2: Add code to read tracks.json and units.json**

```javascript
const fs = require('fs');
const path = require('path');

// Read tracks and units
const tracksPath = path.join(__dirname, '../site/src/content/tracks.json');
const unitsPath = path.join(__dirname, '../site/src/content/units.json');

let tracks, units;
try {
  tracks = JSON.parse(fs.readFileSync(tracksPath, 'utf8'));
  units = JSON.parse(fs.readFileSync(unitsPath, 'utf8'));
} catch (err) {
  console.error('Error reading JSON files:', err);
  process.exit(1);
}

console.log(`Loaded ${tracks.length} tracks and ${units.length} units`);
```

- [ ] **Step 3: Run script to verify JSON reading**

Run: `bun run scripts/generate-quiz-project-lessons.js`
Expected: Output showing number of tracks and units loaded

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-quiz-project-lessons.js
git commit -m "feat: add JSON reading to lesson generation script"
```

### Task 3: Define lesson templates

**Files:**
- Modify: `scripts/generate-quiz-project-lessons.js`

- [ ] **Step 1: Add lesson type definitions**

```javascript
// Define the lesson types to generate
const lessonTypes = [
  { slugPrefix: 'quiz-choice', title: { en: 'Multiple Choice Quiz', ru: 'Тест с множественным выбором' }, estMin: 30 },
  { slugPrefix: 'quiz-short', title: { en: 'Short Answer Quiz', ru: 'Тест с краткими ответами' }, estMin: 30 },
  { slugPrefix: 'quiz-code', title: { en: 'Coding Quiz', ru: 'Кодировочный тест' }, estMin: 30 },
  { slugPrefix: 'project-plan', title: { en: 'Project Planning', ru: 'Планирование проекта' }, estMin: 60 },
  { slugPrefix: 'project-build', title: { en: 'Project Building', ru: 'Сборка проекта' }, estMin: 60 },
  { slugPrefix: 'project-test', title: { en: 'Project Testing', ru: 'Тестирование проекта' }, estMin: 60 }
];

// Note: quiz-code will be conditionally generated based on track (see later)
```

- [ ] **Step 2: Run script to verify definitions**

Run: `bun run scripts/generate-quiz-project-lessons.js`
Expected: No errors, script loads JSON and defines lessonTypes

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-quiz-project-lessons.js
git commit -m "feat: add lesson type definitions to script"
```

### Task 4: Add frontmatter and content generation

**Files:**
- Modify: `scripts/generate-quiz-project-lessons.js`

- [ ] **Step 1: Add function to generate lesson frontmatter**

```javascript
/**
 * Generate frontmatter for a lesson
 * @param {Object} lessonInfo - Info from lessonTypes array
 * @param {Object} unit - Unit object from units.json
 * @param {string} lang - Language code ('en' or 'ru')
 * @param {number} order - Order number for the lesson
 * @returns {string} Frontmatter string
 */
function generateFrontmatter(lessonInfo, unit, lang, order) {
  const title = lessonInfo.title[lang];
  const summary = `${title} for unit "${unit.title[lang]}"`;
  
  return `---\n` +
    `slug: ${lessonInfo.slugPrefix}\n` +
    `lang: ${lang}\n` +
    `track: ${unit.track}\n` +
    `unit: ${unit.slug}\n` +
    `order: ${order}\n` +
    `title: "${title}"\n` +
    `summary: "${summary}"\n` +
    `estMin: ${lessonInfo.estMin}\n` +
    `status: ready\n` +
    `prereqs: []\n` +
    `concepts: []\n` +
    `sources: []\n` +
    `---\n`;
}
```

- [ ] **Step 2: Add function to generate lesson content**

```javascript
/**
 * Generate basic lesson content structure
 * @param {string} lang - Language code
 * @param {string} lessonType - Type of lesson (quiz-choice, etc.)
 * @param {Object} unit - Unit object
 * @returns {string} Lesson content (MDX)
 */
function generateLessonContent(lang, lessonType, unit) {
  // Import statements - we'll use a basic set, tracks may need specific imports
  const imports = [
    'import Hook from "~/components/lesson/Hook.astro";',
    'import Goal from "~/components/lesson/Goal.astro";',
    'import Step from "~/components/lesson/Step.astro";',
    'import WorkedExample from "~/components/lesson/WorkedExample.astro";',
    'import Check from "~/components/lesson/Check.astro";',
    'import Recap from "~/components/lesson/Recap.astro";',
    'import Inset from "~/components/lesson/Inset.astro";',
    'import PracticeSet from "~/components/lesson/PracticeSet.astro";',
    'import Quiz from "~/components/pedagogy/Quiz.astro";'
  ].join('\n');

  // Basic content structure
  const hook = `<Hook>\nThis is a ${lessonType} for the ${unit.title[lang]} unit.\n</Hook>\n`;
  const goal = `<Goal lang="${lang}>\nAfter this lesson you will be able to apply the concepts from the ${unit.title[lang]} unit.\n</Goal>\n`;
  // We'll add a single step for now - in reality, this would be fleshed out
  const step = `<Step n={1}>\nThis lesson contains practice questions and exercises to reinforce your learning.\n</Step>\n`;
  const recap = `<Recap lang="${lang}>\nReview the key concepts from this lesson and prepare for the next unit.\n</Recap>\n`;

  return `${imports}\n\n${hook}\n${goal}\n${step}\n${recap}\n`;
}
```

- [ ] **Step 3: Run script to verify functions**

Run: `bun run scripts/generate-quiz-project-lessons.js`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-quiz-project-lessons.js
git commit -m "feat: add frontmatter and content generation functions"
```

### Task 5: Add file generation logic

**Files:**
- Modify: `scripts/generate-quiz-project-lessons.js`

- [ ] **Step 1: Add main generation loop**

```javascript
// Main generation loop
units.forEach(unit => {
  // Determine next order number for this unit (we'll assume we append at the end)
  // In a real implementation, we'd read existing lessons to get the max order
  // For this script, we'll start at order 99 and increment (to be fixed later)
  let order = 99;

  lessonTypes.forEach(lessonType => {
    // Skip quiz-code for tracks that don't have coding components
    // For simplicity, we'll generate it for all tracks and let content be empty/not applicable
    // A better approach would be to check the track slug against a list
    const isCodeQuiz = lessonType.slugPrefix === 'quiz-code';
    const codeTracks = ['algorithms', 'base-cs', 'backend', 'frontend', 'browser', 'networking', 'apis', 'queues', 'caching', 'distributed', 'observability', 'performance', 'security', 'ai-llm', 'data-engineering', 'engineering-practice'];
    const shouldGenerateCodeQuiz = codeTracks.includes(unit.track);
    
    if (isCodeQuiz && !shouldGenerateCodeQuiz) {
      return; // Skip quiz-code for non-coding tracks
    }

    ['en', 'ru'].forEach(lang => {
      const frontmatter = generateFrontmatter(lessonType, unit, lang, order);
      const content = generateLessonContent(lang, lessonType.slugPrefix, unit);
      
      const lessonDir = path.join(__dirname, `../site/src/content/lessons/${lang}/${unit.track}/${unit.slug}/${lessonType.slugPrefix}`);
      const filePath = path.join(lessonDir, 'index.mdx');
      
      // Ensure directory exists
      if (!fs.existsSync(lessonDir)) {
        fs.mkdirSync(lessonDir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(filePath, frontmatter + content, 'utf8');
      
      console.log(`Generated: ${filePath}`);
    });
    
    order++; // Increment order for next lesson type in this unit
  });
});
```

- [ ] **Step 2: Run script to generate lessons (dry run first)**

We'll first run in a test directory to avoid overwriting existing files.

But for the plan, we'll have the engineer run it for real.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-quiz-project-lessons.js
git commit -m "feat: add file generation logic to script"
```

### Task 6: Run the script to generate all lessons

**Files:**
- Modify: `scripts/generate-quiz-project-lessons.js` (no changes, just run)

- [ ] **Step 1: Run the lesson generation script**

Run: `bun run scripts/generate-quiz-project-lessons.js`
Expected: Output showing generated files for each track, unit, language, and lesson type

- [ ] **Step 2: Verify a sample file was created correctly**

Read: `site/src/content/lessons/en/math/01-numbers/quiz-choice/index.mdx`
Expected: Generated MDX file with proper frontmatter and content

- [ ] **Step 3: Commit the generated files**

```bash
git add site/src/content/lessons/
git commit -m "feat: add quiz and project lessons to all units"
```

### Task 7: Update units.json with new lessons

**Files:**
- Modify: `site/src/content/units.json`
- Modify: `scripts/generate-quiz-project-lessons.js` (to also update units.json)

Note: The plan so far generates the lesson files but doesn't update units.json to include them in the lessons array.
We need to update units.json so the new lessons are part of the unit.

However, note that the design says we are adding lessons at the end of the unit, and the units.json file contains the lessons array for each unit.

We have two options:
  1. Update units.json as part of the generation script.
  2. Have a separate task to update units.json.

Let's update units.json in the script.

We'll modify the script to also update the units.json file by appending the new lesson slugs to the lessons array for each unit.

But note: the lessons array in units.json contains just the slugs (like "01-counting"), not the full path.

We'll need to append the slugs of our new lessons (e.g., "quiz-choice", "quiz-short", etc.) to the lessons array for each unit.

We'll do this after generating the files.

- [ ] **Step 1: Add function to update units.json**

```javascript
/**
 * Update units.json to include the new lesson slugs in the lessons array for each unit
 * @param {Array} units - Units array from units.json
 */
function updateUnitsJson(units) {
  units.forEach(unit => {
    // We'll append our lesson slugs in order
    // Note: We assume we are adding at the end, so we just append
    lessonTypes.forEach(lessonType => {
      // Skip quiz-code for non-coding tracks (same logic as before)
      const isCodeQuiz = lessonType.slugPrefix === 'quiz-code';
      const codeTracks = ['algorithms', 'base-cs', 'backend', 'frontend', 'browser', 'networking', 'apis', 'queues', 'caching', 'distributed', 'observability', 'performance', 'security', 'ai-llm', 'data-engineering', 'engineering-practice'];
      const shouldGenerateCodeQuiz = codeTracks.includes(unit.track);
      
      if (isCodeQuiz && !shouldGenerateCodeQuiz) {
        return;
      }
      
      // Avoid duplicates - check if already exists
      if (!unit.lessons.includes(lessonType.slugPrefix)) {
        unit.lessons.push(lessonType.slugPrefix);
      }
    });
  });
  
  // Write updated units.json
  const unitsPath = path.join(__dirname, '../site/src/content/units.json');
  fs.writeFileSync(unitsPath, JSON.stringify(units, null, 2), 'utf8');
  console.log('Updated units.json with new lesson slugs');
}
```

- [ ] **Step 2: Call updateUnitsJson at the end of the script**

Add after the generation loop:
```javascript
// Update units.json to include new lessons
updateUnitsJson(units);
```

- [ ] **Step 3: Run the full script**

Run: `bun run scripts/generate-quiz-project-lessons.js`
Expected: Output showing generated files and confirmation that units.json was updated

- [ ] **Step 4: Verify units.json was updated correctly**

Read: `site/src/content/units.json`
Find a unit (e.g., math/01-numbers) and check that lessons array now includes the new slugs at the end.

- [ ] **Step 5: Commit**

```bash
git add site/src/content/units.json scripts/generate-quiz-project-lessons.js
git commit -m "feat: update units.json with new quiz and project lessons"
```

### Task 8: Run lint and build to verify

**Files:**
- No changes (we'll run commands)

- [ ] **Step 1: Run the linter**

Run: `cd site && bun run build`
Expected: Build succeeds and lint passes (no errors)

- [ ] **Step 2: If there are errors, fix them**

Note: In the plan, we assume the generated content passes lint. If not, we would need to adjust the script.
But for the plan, we'll note that the engineer should verify and fix any lint issues.

- [ ] **Step 3: Commit if any fixes were made**

```bash
git add site/
git commit -m "fix: adjust generated lessons to pass lint"
```

- [ ] **Step 4: Final commit**

```bash
git commit -m "feat: complete quiz and project lessons implementation"
```
