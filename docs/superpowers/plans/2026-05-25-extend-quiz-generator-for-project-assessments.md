# Extend Quiz Generator for Project Assessments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify quiz_generator.py to generate project-based assessments (build, test, plan) in addition to existing quiz assessments for each unit in foundations tracks, producing bilingual EN+RU content.

**Architecture:** Extend existing Python script by adding three new assessment types (project-build, project-test, project-plan) with corresponding LLM prompts. Reuse concept extraction logic and file update mechanisms. Process all tracks/units for both languages sequentially.

**Tech Stack:** Python 3.x, requests library, LLM API (local endpoint), file system operations.

---

### Task 1: Backup original script

**Files:**
- Create: `docs/superpowers/plans/2026-05-25-extend-quiz-generator-for-project-assessments.md`
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py.backup`

- [ ] **Step 1: Create backup of original quiz_generator.py**

```bash
cp /Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py /Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py.backup
```

- [ ] **Step 2: Verify backup created successfully**

Run: `ls -la /Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py.backup`
Expected: File exists with same size as original

### Task 2: Extend quiz types list

**Files:**
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py:518-520`

- [ ] **Step 1: Modify quiz_types list to include project assessments**

```python
        for quiz_type in ['quiz-choice', 'quiz-short', 'quiz-code', 'project-build', 'project-test', 'project-plan']:
```

- [ ] **Step 2: Update loop to handle new quiz types**

Currently the loop processes only quiz-choice, quiz-short, quiz-code. Change to process all six types.

### Task 3: Add project assessment prompts

**Files:**
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py:114-183`

- [ ] **Step 1: Add project-build prompt to generate_quiz_with_llm function**

```python
    elif quiz_type == 'project-build':
        prompt = f"""Generate a project-based learning assignment for a senior fullstack engineering curriculum unit titled "{unit_title}".

Based on these key concepts: {', '.join(concepts_list)}

Create a hands-on project that requires applying the unit's concepts to solve a realistic problem. Provide:
- Clear project description and objectives
- Functional requirements and constraints
- Suggested technology stack or tools
- Estimated difficulty and time commitment

Your response MUST be ONLY a valid JSON object with this exact structure:
{{
    "project_title": "Descriptive project name",
    "description": "Detailed project overview and goals",
    "requirements": ["Requirement 1", "Requirement 2", "Requirement 3"],
    "constraints": ["Constraint 1", "Constraint 2"],
    "suggested_stack": ["Tech 1", "Tech 2"],
    "estimated_hours": 8
}}

Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
"""
```

- [ ] **Step 2: Add project-test prompt**

```python
    elif quiz_type == 'project-test':
        prompt = f"""Generate test criteria and validation approach for a project-based learning assignment in a senior fullstack engineering curriculum unit titled "{unit_title}".

Based on these key concepts: {', '.join(concepts_list)}

Create evaluation criteria that verify understanding and correct implementation of the unit's concepts. Provide:
- Test scenarios and edge cases to validate
- Expected behaviors and outputs
- Success criteria and metrics
- Suggested automated tests if applicable

Your response MUST be ONLY a valid JSON object with this exact structure:
{{
    "test_scenarios": ["Scenario 1", "Scenario 2", "Scenario 3"],
    "expected_outcomes": ["Outcome 1", "Outcome 2"],
    "success_criteria": ["Criterion 1", "Criterion 2", "Criterion 3"],
    "automated_tests": ["Test idea 1", "Test idea 2"],
    "evaluation_notes": "Important considerations for evaluation"
}}

Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
"""
```

- [ ] **Step 3: Add project-plan prompt**

```python
    elif quiz_type == 'project-plan':
        prompt = f"""Generate a project planning document for a senior fullstack engineering curriculum unit titled "{unit_title}".

Based on these key concepts: {', '.join(concepts_list)}

Create a structured plan for completing the project-based learning assignment. Provide:
- Milestones with deliverables and timelines
- Resource requirements and dependencies
- Risk assessment and mitigation strategies
- Learning objectives alignment checkpoints

Your response MUST be ONLY a valid JSON object with this exact structure:
{{
    "milestones": [
        {{"name": "Milestone 1", "deliverable": "What to produce", "timeline": "X hours/days"}},
        {{"name": "Milestone 2", "deliverable": "What to produce", "timeline": "Y hours/days"}}
    ],
    "resources_needed": ["Resource 1", "Resource 2"],
    "dependencies": ["Dependency 1", "Dependency 2"],
    "risks": [{{"risk": "Risk description", "mitigation": "How to address"}}],
    "learning_checkpoints": ["Checkpoint 1", "Checkpoint 2"]
}}

Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
"""
```

### Task 4: Update file update logic

**Files:**
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py:365-462`

- [ ] **Step 1: Extend update_quiz_file function to handle project assessment types**

Add new conditionals for project-build, project-test, project-plan that generate appropriate MDX content using the Quiz component or custom components as needed.

For project-build:
```python
    elif quiz_type == 'project-build':
        unit_slug = quiz_path.split('/')[-2]
        # Format requirements and constraints as lists
        reqs_list = ', '.join([f'"{req}"' for req in quiz_data['requirements']])
        cons_list = ', '.join([f'"{cons}"' for cons in quiz_data['constraints']])
        stack_list = ', '.join([f'"{stack}"' for stack in quiz_data['suggested_stack']])
        quiz_component = f'''<ProjectBuild
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  title="{json.dumps(quiz_data['project_title'])[1:-1]}"
  description="{json.dumps(quiz_data['description'])[1:-1]}"
  requirements=[{reqs_list}]
  constraints=[{cons_list}]
  suggestedStack=[{stack_list}]
  estimatedHours={quiz_data['estimated_hours']}
/>'''
        quiz_block = quiz_component
```

For project-test:
```python
    elif quiz_type == 'project-test':
        unit_slug = quiz_path.split('/')[-2]
        scenarios_list = ', '.join([f'"{sc}"' for sc in quiz_data['test_scenarios']])
        outcomes_list = ', '.join([f'"{out}"' for out in quiz_data['expected_outcomes']])
        criteria_list = ', '.join([f'"{crit}"' for crit in quiz_data['success_criteria']])
        quiz_component = f'''<ProjectTest
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  testScenarios=[{scenarios_list}]
  expectedOutcomes=[{outcomes_list}]
  successCriteria=[{criteria_list}]
  automatedTests={[f'"{test}"' for test in quiz_data['automated_tests']]}
  evaluationNotes="{json.dumps(quiz_data['evaluation_notes'])[1:-1]}"
/>'''
        quiz_block = quiz_component
```

For project-plan:
```python
    elif quiz_type == 'project-plan':
        unit_slug = quiz_path.split('/')[-2]
        # Format milestones as JSON array of objects
        milestones_json = json.dumps(quiz_data['milestones'])
        resources_list = ', '.join([f'"{res}"' for res in quiz_data['resources_needed']])
        deps_list = ', '.join([f'"{dep}"' for dep in quiz_data['dependencies']])
        risks_json = json.dumps(quiz_data['risks'])
        checkpoints_list = ', '.join([f'"{cp}"' for cp in quiz_data['learning_checkpoints']])
        quiz_component = f'''<ProjectPlan
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  milestones={milestones_json}
  resourcesNeeded=[{resources_list}]
  dependencies=[{deps_list}]
  risks={risks_json}
  learningCheckpoints=[{checkpoints_list}]
/>'''
        quiz_block = quiz_component
```

- [ ] **Step 2: Ensure insertion point logic works for new components**

Keep the existing logic that inserts after Recap component or at end.

### Task 5: Test on single unit

**Files:**
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py` (for testing)
- Create: Temporary test directory if needed

- [ ] **Step 1: Modify script to limit processing to single unit for testing**

Add a test mode flag or modify the loops to process only:
- Track: 'math'
- Unit: '01-numbers'
- Languages: 'en' only

- [ ] **Step 2: Run test execution**

Run: `cd /Users/artemmac/dev/awesome-everything/scripts && python3 quiz_generator.py`
Expected: Generates assessment files for math/01-numbers/en/* without errors

- [ ] **Step 3: Verify generated files**

Check that:
- quiz-choice/index.mdx, quiz-short/index.mdx, quiz-code/index.mdx updated
- project-build/index.mdx, project-test/index.mdx, project-plan/index.mdx created/updated
- Content is valid MDX with appropriate components

- [ ] **Step 4: Fix any issues**

If errors occur, debug and fix before proceeding.

### Task 6: Run full generation

**Files:**
- Modify: `/Users/artemmac/dev/awesome-everything/scripts/quiz_generator.py` (remove test limitations)

- [ ] **Step 1: Remove test limitations to process all tracks/units/languages**

- [ ] **Step 2: Execute full generation**

Run: `cd /Users/artemmac/dev/awesome-everything/scripts && python3 quiz_generator.py`
Expected: Processes all tracks (math, algorithms, base-cs, etc.), all units, both languages (en, ru)

- [ ] **Step 3: Monitor for errors**

Check output for any failures and note which units/types failed.

### Task 7: Verify and commit

**Files:**
- Modify: Multiple files in `site/src/content/lessons/*/*/*/project-*`
- Modify: Multiple files in `site/src/content/lessons/*/*/*/quiz-*` (existing)

- [ ] **Step 1: Spot-check generated content**

Verify a sample of generated files from each type and language for correctness and formatting.

- [ ] **Step 2: Run linter to ensure no MDX/JSX errors**

Run: `cd /Users/artemmac/dev/awesome-everything/site && bun run build`
Expected: Lint clean (no errors)

- [ ] **Step 3: Commit changes**

```bash
git add scripts/quiz_generator.py
git add site/src/content/lessons/  # or be more specific if preferred
git commit -m "feat(quiz_generator): add project-based assessments for all units EN+RU"
```

- [ ] **Step 4: Push to remote (if applicable)**

Run: `git push origin main` (or appropriate branch)
