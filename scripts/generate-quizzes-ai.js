#!/usr/bin/env node
/**
 * Autonomous Quiz Generator with AI
 * - Reads all lesson MDX files
 * - Extracts content and concepts
 * - Generates quiz questions via LLM API
 * - Handles retries, errors, checkpoint saving
 * - Resumes on restart
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiBase: process.env.API_BASE || 'https://api.openai.com/v1',
  apiKey: process.env.API_KEY || process.env.OPENAI_API_KEY,
  model: process.env.MODEL || 'gpt-4o-mini',
  batchSize: 5,
  maxRetries: 3,
  delayBetweenBatches: 1000,
  checkpointFile: './quiz-generation-checkpoint.json'
};

// State management
let state = {
  processed: [],
  failed: [],
  inProgress: [],
  startTime: null,
  lastCheckpoint: null
};

// Load checkpoint if exists
function loadCheckpoint() {
  if (fs.existsSync(CONFIG.checkpointFile)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG.checkpointFile, 'utf8'));
      state = { ...state, ...saved };
      console.log('[Checkpoint] Resumed from', state.lastCheckpoint);
    } catch (e) {
      console.warn('[Checkpoint] Failed to load:', e.message);
    }
  }
}

// Save checkpoint
function saveCheckpoint() {
  state.lastCheckpoint = new Date().toISOString();
  fs.writeFileSync(CONFIG.checkpointFile, JSON.stringify(state, null, 2));
}

// Discover all lessons to process
function discoverLessons() {
  const lessonsDir = path.join(__dirname, '../site/src/content/lessons');
  const lessons = [];

  const langs = ['en', 'ru'];
  langs.forEach(lang => {
    const langDir = path.join(lessonsDir, lang);
    if (!fs.existsSync(langDir)) return;

    fs.readdirSync(langDir).forEach(track => {
      const trackDir = path.join(langDir, track);
      if (!fs.existsSync(trackDir)) return;

      fs.readdirSync(trackDir).forEach(unit => {
        const unitDir = path.join(trackDir, unit);
        const stat = fs.statSync(unitDir);
        if (!stat.isDirectory()) return;

        // Find all topic lessons (not quiz/project)
        fs.readdirSync(unitDir).forEach(item => {
          if (!/^[0-9]/.test(item)) return;
          const itemPath = path.join(unitDir, item);
          const itemStat = fs.statSync(itemPath);
          if (!itemStat.isDirectory()) return;

          const indexPath = path.join(itemPath, 'index.mdx');
          if (fs.existsSync(indexPath)) {
            lessons.push({
              lang, track, unit, topic: item,
              indexPath,
              unitPath: unitDir
            });
          }
        });
      });
    });
  });

  return lessons;
}

// Extract content from lesson MDX
function extractLessonContent(mdxPath) {
  const content = fs.readFileSync(mdxPath, 'utf8');

  // Extract frontmatter
  const fmMatch = content.match(/---\n([\s\S]*?)\n---/);
  const frontmatter = {};
  if (fmMatch) {
    fmMatch[1].split('\n').forEach(line => {
      const [key, ...valParts] = line.split(':');
      if (key && valParts.length) {
        frontmatter[key.trim()] = valParts.join(':').trim().replace(/^["']|["']$/g, '');
      }
    });
  }

  // Extract main content (after imports)
  const bodyMatch = content.match(/import[\s\S]*?\n\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1] : content;

  // Extract key concepts from text
  const concepts = extractConcepts(body, frontmatter.concepts);

  return { frontmatter, body, concepts };
}

function extractConcepts(text, declaredConcepts) {
  const concepts = new Set(declaredConcepts ? declaredConcepts.split(',').map(c => c.trim()) : []);

  const keywords = [
    'database', 'table', 'index', 'query', 'transaction',
    'network', 'protocol', 'TCP', 'HTTP', 'DNS',
    'algorithm', 'complexity', 'sort', 'search', 'graph',
    'security', 'encryption', 'authentication', 'authorization',
    'frontend', 'component', 'render', 'state', 'hook',
    'distributed', 'consensus', 'replication', 'sharding',
    'cache', 'performance', 'latency', 'throughput'
  ];

  keywords.forEach(kw => {
    if (new RegExp('\\b' + kw + '\\b', 'i').test(text)) {
      concepts.add(kw);
    }
  });

  return Array.from(concepts);
}

// Generate quiz questions via API
async function generateQuizWithRetry(lesson, attempt = 1) {
  if (!CONFIG.apiKey) {
    return generatePlaceholderQuestions(lesson);
  }

  try {
    const response = await fetch(`${CONFIG.apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: CONFIG.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert quiz generator for technical engineering content. Generate 4 multiple-choice questions that test deep understanding.'
          },
          {
            role: 'user',
            content: `Generate quiz questions for this lesson:

Title: ${lesson.title}
Concepts: ${lesson.concepts.join(', ')}

Content summary:
${lesson.body.substring(0, 2000)}

Output format (JSON only):
{
  "questions": [
    {
      "question": "...",
      "choices": [
        { "label": "...", "correct": true },
        { "label": "...", "correct": false }
      ]
    }
  ]
}`
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from API');
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    if (attempt < CONFIG.maxRetries) {
      console.log(`[Retry] Attempt ${attempt + 1} for ${lesson.topic}...`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return generateQuizWithRetry(lesson, attempt + 1);
    }
    throw error;
  }
}

function generatePlaceholderQuestions(lesson) {
  const concepts = lesson.concepts.slice(0, 4);
  if (concepts.length === 0) {
    concepts.push(lesson.title || 'this topic');
  }

  return {
    questions: concepts.map((concept, i) => ({
      question: `What is a key aspect of ${concept} in the context of ${lesson.title}?`,
      choices: [
        { label: `Understanding the fundamental mechanisms and tradeoffs of ${concept}`, correct: true },
        { label: 'It is only relevant for junior developers', correct: false },
        { label: 'It has no practical applications', correct: false },
        { label: 'It is purely theoretical', correct: false }
      ]
    }))
  };
}

// Generate quiz MDX file content
function generateQuizMDX(lang, unitTitle, questions, lessonSlug) {
  const hookText = lang === 'en'
    ? `This quiz covers the key concepts from the ${unitTitle} unit.`
    : `Этот тест охватывает ключевые концепции темы ${unitTitle}.`;

  const recapText = lang === 'en'
    ? `Review completed. You should now be ready to move to the next unit or project.`
    : `Обзор завершён. Вы должны быть готовы перейти к следующей теме или проекту.`;

  let quizComponents = questions.questions.map((q, i) => {
    const choicesStr = q.choices.map(c => {
      return `      { label: "${c.label.replace(/"/g, '\\"')}", correct: ${c.correct}}`;
    }).join(',\n');

    return `  <Quiz
    id="${lang === 'en' ? 'quiz' : 'test'}-q${i + 1}"
    lessonSlug="${lessonSlug}"
    lang="${lang}"
    question="${q.question.replace(/"/g, '\\"')}"
    choices={[
${choicesStr}
    ]}
  />`;
  }).join('\n\n');

  return `import Hook from "~/components/lesson/Hook.astro";
import Goal from "~/components/lesson/Goal.astro";
import Step from "~/components/lesson/Step.astro";
import Recap from "~/components/lesson/Recap.astro";
import Quiz from "~/components/pedagogy/Quiz.astro";

<Hook>
${hookText}
</Hook>

<Goal lang="${lang}">
After this lesson you will be able to explain and apply the concepts from the ${unitTitle} unit.
</Goal>

<Step n={1}>
Answer the following questions to test your understanding.
</Step>

${quizComponents}

<Recap lang="${lang}">
${recapText}
</Recap>
`;
}

// Main processing loop
async function processLessons() {
  console.log('[Starting] Quiz generation...');
  loadCheckpoint();

  const allLessons = discoverLessons();
  console.log(`[Discovery] Found ${allLessons.length} lessons`);

  const toProcess = allLessons.filter(l => {
    const key = `${l.lang}/${l.track}/${l.unit}/${l.topic}`;
    return !state.processed.includes(key);
  });

  console.log(`[Queue] ${toProcess.length} lessons pending`);

  state.startTime = state.startTime || new Date().toISOString();

  for (let i = 0; i < toProcess.length; i += CONFIG.batchSize) {
    const batch = toProcess.slice(i, i + CONFIG.batchSize);
    console.log(`[Batch] Processing ${i + 1}-${Math.min(i + CONFIG.batchSize, toProcess.length)} of ${toProcess.length}`);

    await Promise.all(batch.map(async lesson => {
      const key = `${lesson.lang}/${lesson.track}/${lesson.unit}/${lesson.topic}`;

      try {
        state.inProgress.push(key);
        saveCheckpoint();

        console.log(`[Processing] ${lesson.lang}/${lesson.unit}/${lesson.topic}`);

        const { frontmatter, body, concepts } = extractLessonContent(lesson.indexPath);

        const quizData = await generateQuizWithRetry({
          title: frontmatter.title || lesson.topic,
          concepts,
          body
        });

        const quizTypes = ['quiz-choice', 'quiz-short'];
        quizTypes.forEach(quizType => {
          ['en', 'ru'].forEach(lang => {
            const quizDir = path.join(lesson.unitPath, quizType);
            const quizPath = path.join(quizDir, 'index.mdx');

            if (!fs.existsSync(quizPath) || fs.readFileSync(quizPath, 'utf8').includes('This is a')) {
              const mdxContent = generateQuizMDX(
                lang,
                frontmatter.title || lesson.topic,
                quizData,
                lesson.topic
              );

              if (!fs.existsSync(quizDir)) {
                fs.mkdirSync(quizDir, { recursive: true });
              }

              fs.writeFileSync(quizPath, mdxContent, 'utf8');
              console.log(`[Generated] ${quizPath}`);
            }
          });
        });

        state.processed.push(key);
        state.inProgress = state.inProgress.filter(k => k !== key);
        saveCheckpoint();

      } catch (error) {
        console.error(`[Failed] ${key}: ${error.message}`);
        state.failed.push({ key, error: error.message, timestamp: new Date().toISOString() });
        state.inProgress = state.inProgress.filter(k => k !== key);
        saveCheckpoint();
      }
    }));

    if (i + CONFIG.batchSize < toProcess.length) {
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenBatches));
    }
  }

  console.log('\n=== Generation Complete ===');
  console.log(`Processed: ${state.processed.length}`);
  console.log(`Failed: ${state.failed.length}`);
  console.log(`Duration: ${((new Date() - new Date(state.startTime)) / 1000 / 60).toFixed(1)} min`);

  if (state.failed.length > 0) {
    console.log('\nFailed items:');
    state.failed.forEach(f => console.log(`  - ${f.key}: ${f.error}`));
  }
}

// Signal handling
process.on('unhandledRejection', (error) => {
  console.error('[Unhandled] Error:', error);
  saveCheckpoint();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n[Interrupt] Saving checkpoint and exiting...');
  saveCheckpoint();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Terminate] Saving checkpoint and exiting...');
  saveCheckpoint();
  process.exit(0);
});

// Start
processStartTime = new Date();
processLessons().catch(error => {
  console.error('[Fatal] Script failed:', error);
  saveCheckpoint();
  process.exit(1);
});