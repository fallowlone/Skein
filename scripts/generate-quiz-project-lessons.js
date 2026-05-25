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