# Quiz Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all quiz stubs with full quizzes generated from unit concepts and remove zero-level orientation lessons from the curriculum.

**Architecture:** 
- Write a Python script that scans the lessons directory for units with quiz stubs.
- For each unit, extract concepts from non-quiz lessons and use an LLM to generate three quiz types (choice, code, short).
- Replace the quiz stub files with generated content.
- Remove all 00-orientation directories and update tracks.json and units.json accordingly.
- Run the site build to verify correctness.

**Tech Stack:** 
- Python 3.x for scripting
- LLM via MCP (context7) or direct API for quiz generation
- Bun for site build and linting
- Git for version control

---
### Task 1: Scout for quiz stubs and zero-level units

**Files:**
- Modify: `scripts/quiz_generator.py` (create)

- [ ] **Step 1: Write script to find all quiz stub directories**

```python
import os
from pathlib import Path

lessons_root = Path("site/src/content/lessons")
quiz_dirs = []
for root, dirs, files in os.walk(lessons_root):
    for d in dirs:
        if d.startswith("quiz-"):
            quiz_dirs.append(Path(root) / d)
print(f"Found {len(quiz_dirs)} quiz stub directories")
```

- [ ] **Step 2: Run script to verify it finds quiz stubs**

Run: `python scripts/quiz_generator.py`
Expected: Print count of quiz stub directories (should be >0)

- [ ] **Step 3: Write script to find all 00-orientation directories**

```python
zero_units = []
for root, dirs, files in os.walk(lessons_root):
    for d in dirs:
        if d == "00-orientation":
            zero_units.append(Path(root) / d)
print(f"Found {len(zero_units)} zero-level orientation directories")
```

- [ ] **Step 4: Run script to verify it finds zero-level units**

Run: `python scripts/quiz_generator.py`
Expected: Print count of zero-level directories (should be >0)

- [ ] **Step 5: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: add quiz generator script skeleton"
```

### Task 2: Extract concepts from unit lessons

**Files:**
- Modify: `scripts/quiz_generator.py`

- [ ] **Step 1: Write function to extract concepts from a unit's lessons**

```python
import frontmatter
import re

def extract_concepts_from_unit(unit_path: Path) -> list[str]:
    concepts = set()
    for root, dirs, files in os.walk(unit_path):
        # Skip quiz directories
        dirs[:] = [d for d in dirs if not d.startswith("quiz-")]
        for file in files:
            if file.endswith(".mdx"):
                mdx_path = Path(root) / file
                try:
                    post = frontmatter.load(mdx_path)
                    # Concepts from frontmatter
                    if 'concepts' in post.metadata:
                        concepts.update(post.metadata['concepts'])
                    # Extract capitalized terms or specific patterns from content
                    # Simple approach: look for words in backticks or known patterns
                    content = post.content
                    # Find code spans
                    code_spans = re.findall(r'`([^`]+)`', content)
                    for span in code_spans:
                        if span.islower() and '_' in span:  # likely a concept like pg_statistic
                            concepts.add(span)
                    # Also look for capitalized words (could be acronyms)
                    words = re.findall(r'\b[A-Z][a-zA-Z0-9_]*\b', content)
                    concepts.update(words)
                except Exception as e:
                    print(f"Error reading {mdx_path}: {e}")
    return list(concepts)
```

- [ ] **Step 2: Run function on a sample unit and print concepts**

Add a test in the script:
```python
if __name__ == "__main__":
    # Test on performance/04-gc
    unit_path = lessons_root / "en" / "performance" / "04-gc"
    concepts = extract_concepts_from_unit(unit_path)
    print(f"Concepts for {unit_path}: {concepts}")
```

Run: `python scripts/quiz_generator.py`
Expected: List of concepts extracted from the GC unit

- [ ] **Step 3: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: add concept extraction from lessons"
```

### Task 3: Generate quiz questions via LLM

**Files:**
- Modify: `scripts/quiz_generator.py`

- [ ] **Step 1: Write function to prompt LLM for quiz generation**

```python
import openai  # or use MCP client; we'll assume openai for simplicity

def generate_quiz_for_unit(concepts: list[str], unit_title: str) -> dict:
    # We'll create a prompt that asks for three quiz types
    prompt = f"""
    You are creating quiz questions for a fullstack engineering curriculum unit titled "{unit_title}".
    The unit covers the following concepts: {', '.join(concepts)}.
    Generate three types of quiz questions:
    1. Multiple choice (quiz-choice): 3-5 questions, each with 4 options (A-D), one correct, and a misconception explanation for each distractor.
    2. Code-based (quiz-code): 2-3 questions that involve code snippets (e.g., debugging, output prediction, or writing a small function).
    3. Short answer (quiz-short): 2-3 questions that require a brief explanation or calculation.
    All questions must target a middle+/senior fullstack engineer depth bar: include mechanism, tradeoffs, failure modes, and numbers where appropriate.
    Return a JSON object with keys 'quiz-choice', 'quiz-code', 'quiz-short', each containing an array of question objects.
    For multiple choice: each object has 'question', 'choices' (array of objects with 'label' and 'correct' boolean, and optionally 'misconception'), and 'answerIndex'.
    For code-based: each object has 'question', 'codeSnippet', 'questionText' (if needed), and 'expectedAnswer' or 'explanation'.
    For short answer: each object has 'question' and 'expectedAnswer' (key points).
    """
    # In practice, we would call the LLM API. For the plan, we assume a function that returns the structured data.
    # We'll mock the response for now, but in implementation we'll use the actual LLM.
    # Since we are in a plan, we'll note that the actual implementation will use the LLM via MCP or direct API.
    # For the sake of the plan, we'll write a placeholder that returns an empty structure and then we'll fill in later.
    return {
        "quiz-choice": [],
        "quiz-code": [],
        "quiz-short": []
    }
```

- [ ] **Step 2: Integrate LLM call into the main flow**

We'll assume we have an LLM client set up. We'll note that we need to install any required packages (like openai or use the MCP context7).

- [ ] **Step 3: Run a test generation on a unit and inspect output**

Add a test:
```python
if __name__ == "__main__":
    unit_path = lessons_root / "en" / "performance" / "04-gc"
    concepts = extract_concepts_from_unit(unit_path)
    quiz_data = generate_quiz_for_unit(concepts, "Garbage collection: pause budgets, allocation pressure, and the tail you don't see")
    print(f"Generated quiz data: {quiz_data}")
```

Run: `python scripts/quiz_generator.py`
Expected: See the generated quiz data structure (initially empty, then we'll fill)

- [ ] **Step 4: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: add LLM-based quiz generation"
```

### Task 4: Replace quiz stubs with generated content

**Files:**
- Modify: `scripts/quiz_generator.py`
- Create: `site/src/content/lessons/en/<track>/<unit>/quiz-choice/index.mdx` (and similar for quiz-code, quiz-short) for each unit

- [ ] **Step 1: Write function to write quiz files**

```python
def write_quiz_files(unit_path: Path, quiz_data: dict, lang: str):
    # unit_path is like site/src/content/lessons/en/performance/04-gc
    base = unit_path
    for quiz_type in ["quiz-choice", "quiz-code", "quiz-short"]:
        quiz_dir = base / quiz_type
        quiz_dir.mkdir(exist_ok=True)
        mdx_file = quiz_dir / "index.mdx"
        # We'll generate the MDX frontmatter and body based on quiz_data[quiz_type]
        # For simplicity, we'll assume a helper function that converts quiz_data[quiz_type] to MDX string.
        mdx_content = generate_mdx_for_quiz(quiz_data[quiz_type], quiz_type, lang)
        mdx_file.write_text(mdx_content, encoding="utf-8")
        print(f"Written {mdx_file}")
```

- [ ] **Step 2: Write the MDX generation helper**

```python
def generate_mdx_for_quiz(questions: list, quiz_type: str, lang: str) -> str:
    # Frontmatter
    frontmatter = f"""---
concepts: []
estMin: 30
lang: {lang}
order: 99
prereqs: []
slug: {quiz_type.split('-')[1]}  # e.g., quiz-choice -> choice
sources:
- https://example.com
status: ready
title: {quiz_type.replace('-', ' ').title()}
track: {unit_path.parts[-3]}  # This is a simplification; we'd pass track and unit separately
unit: {unit_path.parts[-1]}
---
"""
    # For quiz-choice, we use the Quiz component
    if quiz_type == "quiz-choice":
        body = ""
        for i, q in enumerate(questions):
            body += f'\n<Quiz\n  id="{quiz_type}-quiz-{i+1}"\n  lessonSlug="{unit_path.parts[-1]}"\n  lang="{lang}"\n  question=\"\"\"{q["question"]}\"\"\"\n  choices={[\n    {{
      "label": "{choice["label"]}",
      "correct": {str(choice.get("correct", "false")).lower()},
      "misconception": "{choice.get("misconception", "")}"\n    }} for choice in q["choices"]\n  ]}\n/>'
        return frontmatter + body
    # Similarly for quiz-code and quiz-short, we'd adapt to the Quiz component or create a custom one.
    # For the plan, we note that we'll need to adjust based on the actual Quiz component's API.
    # We'll assume the Quiz component can handle code-based and short answer with different props.
    # For simplicity, we'll use the same structure and note that the Quiz component is flexible.
    # In reality, we might need to create different components or adjust props.
    # We'll leave the body generation as a placeholder and note that it will be implemented based on the Quiz API.
    return frontmatter + "// TODO: Implement body for " + quiz_type
```

- [ ] **Step 3: Run the full generation on a single unit and verify files are written correctly**

We'll create a test run on one unit (e.g., en/performance/04-gc) and then check the generated MDX.

- [ ] **Step 4: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: write quiz files to disk"
```

### Task 5: Remove zero-level lessons and update metadata

**Files:**
- Modify: `scripts/quiz_generator.py` (to also handle removal)
- Modify: `site/src/content/tracks.json`
- Modify: `site/src/content/units.json`
- Delete: `site/src/content/lessons/{en,ru}/<track>/00-orientation` for each track

- [ ] **Step 1: Write function to remove zero-level directories**

```python
import shutil

def remove_zero_level_units(lessons_root: Path):
    removed = []
    for track_dir in lessons_root.iterdir():
        if track_dir.is_dir():
            zero_dir = track_dir / "00-orientation"
            if zero_dir.exists():
                shutil.rmtree(zero_dir)
                removed.append(zero_dir)
                print(f"Removed {zero_dir}")
    return removed
```

- [ ] **Step 2: Write function to update tracks.json**

```python
import json

def update_tracks_json(tracks_path: Path):
    with tracks_path.open() as f:
        tracks = json.load(f)
    # Remove any track entry where slug is "00-orientation" (but tracks are at top level, units are inside?)
    # Actually, tracks.json is an array of track objects, each track has units? Let's check the structure.
    # From earlier view, tracks.json is an array of track objects with slug, title, etc. No units inside.
    # Units are in units.json? Actually, we saw units.json might be similar.
    # We need to look at the actual files.
    # For the plan, we assume we have to remove the unit with slug "00-orientation" from each track's units.
    # But the structure we saw in tracks.json was just tracks, not units.
    # Let's assume we have a separate file for units per track? Actually, the design mentioned tracks.json and units.json.
    # We'll need to examine them.
    # For now, we'll note that we'll update the JSON files after inspecting their structure.
    pass
```

Given the uncertainty, we'll first inspect the files in a separate step.

- [ ] **Step 3: Inspect tracks.json and units.json structure**

We'll do this in the next task.

- [ ] **Step 4: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: add functions to remove zero-level units"
```

### Task 6: Inspect and update tracks.json and units.json

**Files:**
- Read: `site/src/content/tracks.json`
- Read: `site/src/content/units.json`
- Modify: `site/src/content/tracks.json`
- Modify: `site/src/content/units.json`

- [ ] **Step 1: Examine the structure of tracks.json and units.json**

```bash
cat site/src/content/tracks.json | head -20
cat site/src/content/units.json | head -20
```

- [ ] **Step 2: Based on structure, write updates to remove the zero-level units**

We saw earlier that tracks.json is an array of track objects. Each track does not contain units; units are likely in units.json or per-track files? Actually, the lessons are organized by track/unit/lesson.

We need to see if there is a units.json that lists units per track.

Let's check.

- [ ] **Step 3: Update the JSON files to remove any unit with slug "00-orientation" and renumber orders**

We'll write a Python script to do this.

- [ ] **Step 4: Run the update and verify the JSON is valid**

- [ ] **Step 5: Commit**

```bash
git add site/src/content/tracks.json site/src/content/units.json
git commit -m "feat: remove zero-level units from tracks and units metadata"
```

### Task 7: Run the full quiz generation and zero-level removal

**Files:**
- Modify: `scripts/quiz_generator.py` (to orchestrate everything)

- [ ] **Step 1: Write main function that:**
  1. Finds all units with quiz stubs.
  2. For each unit, extracts concepts.
  3. Generates quiz data via LLM.
  4. Writes quiz files.
  5. Removes zero-level units.
  6. Updates tracks.json and units.json.

- [ ] **Step 2: Run the script on the entire lessons directory**

Run: `python scripts/quiz_generator.py`
Expected: Quiz files generated, zero-level directories removed, metadata updated.

- [ ] **Step 3: Commit**

```bash
git add scripts/quiz_generator.py
git commit -m "feat: run full quiz generation and zero-level removal"
```

### Task 8: Verify the site builds and lints

**Files:**
- None (run commands)

- [ ] **Step 1: Change to site directory and install dependencies**

Run: `cd site && bun install`
Expected: Dependencies installed

- [ ] **Step 2: Run the build**

Run: `bun run build`
Expected: Build succeeds, lint clean, output in dist/

- [ ] **Step 3: If there are errors, fix them and repeat**

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix: resolve build or lint issues after quiz generation"
```

### Task 9: Final verification and cleanup

**Files:**
- None

- [ ] **Step 1: Spot-check a few generated quiz files for quality and depth**

We'll manually open a few quiz-choice/index.mdx files to ensure they have proper questions.

- [ ] **Step 2: Ensure no zero-level directories remain**

Run: `find site/src/content/lessons -type d -name "00-orientation"`
Expected: No output

- [ ] **Step 3: Commit any final adjustments**

```bash
git add -u
git commit -m "chore: final verification and cleanup"
```