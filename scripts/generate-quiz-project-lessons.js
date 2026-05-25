#!/usr/bin/env bun
/**
 * Script to generate quiz and project lessons for all units in all tracks.
 * Reads tracks.json and units.json to determine the structure.
 * Creates lesson files in site/src/content/lessons/{en,ru}/{track}/{unit}/{lesson}/index.mdx
 */

const fs = require('fs');
const path = require('path');

// Define the lesson types to generate
const lessonTypes = [
  { slugPrefix: 'quiz-choice', title: { en: 'Multiple Choice Quiz', ru: 'Тест с множественным выбором' }, estMin: 30 },
  { slugPrefix: 'quiz-short', title: { en: 'Short Answer Quiz', ru: 'Тест с краткими ответами' }, estMin: 30 },
  { slugPrefix: 'quiz-code', title: { en: 'Coding Quiz', ru: 'Кодировочный тест' }, estMin: 30 },
  { slugPrefix: 'project-plan', title: { en: 'Project Planning', ru: 'Планирование проекта' }, estMin: 60 },
  { slugPrefix: 'project-build', title: { en: 'Project Building', ru: 'Сборка проекта' }, estMin: 60 },
  { slugPrefix: 'project-test', title: { en: 'Project Testing', ru: 'Тестирование проекта' }, estMin: 60 }
];

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

// Update units.json to include new lessons
updateUnitsJson(units);