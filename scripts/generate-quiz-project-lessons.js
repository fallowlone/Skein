#!/usr/bin/env bun
/**
 * Script to generate quiz and project lessons for all units in all tracks.
 * Reads tracks.json and units.json to determine the structure.
 * Creates lesson files in site/src/content/lessons/{en,ru}/{track}/{unit}/{lesson}/index.mdx
 */

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