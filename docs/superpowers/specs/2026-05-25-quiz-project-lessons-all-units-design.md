# Quiz and Project Lessons Design Spec

## Overview
Add quiz and project lessons to the end of every unit across all tracks in the curriculum site. Each unit will gain:
- A quiz lesson (approx 30 minutes) with multiple-choice, short answer, and coding exercises
- A project lesson (1-2 days) broken into multiple steps for practical application

## Architecture and Components

### New Lesson Types
For each unit, add these new lessons at the end:
1. `quiz-choice.mdx` - Multiple-choice questions on unit concepts
2. `quiz-short.mdx` - Short answer questions requiring brief explanations  
3. `quiz-code.mdx` - Coding/algorithmic exercises (if applicable to track)
4. `project-plan.mdx` - Project requirements and proposed approach
5. `project-build.mdx` - Implementation guidance and milestones
6. `project-test.mdx` - Evaluation criteria and self-assessment rubric

### Lesson Structure
All new lessons follow the existing MDX format:
- Frontmatter with slug, lang, track, unit, order, title, summary, estMin, status, prereqs, concepts, sources
- Standard imports: Hook, Goal, Step, WorkedExample, Check, Recap, Inset, PracticeSet, Quiz
- Track-specific component imports as needed (math/, algorithms/, etc.)
- Bilingual EN/RU content following i18n patterns

### Integration Points
- Lessons are appended to each unit's lessons array in units.json
- Order numbers automatically increment after existing lessons
- Prereqs reference the previous lesson in the unit
- Concepts align with unit's learning objectives
- Sources cite relevant curriculum materials

## Data Flow and Lesson Structure

### Unit Flow Integration
Existing unit structure:
```
[Lesson 1] → [Lesson 2] → ... → [Lesson N] 
```

New structure with assessments:
```
[Lesson 1] → [Lesson 2] → ... → [Lesson N] → 
[Quiz Choice] → [Quiz Short] → [Quiz Code] → 
[Project Plan] → [Project Build] → [Project Test]
```

### Quiz Lesson Details
**quiz-choice.mdx**:
- Hook: Engaging scenario related to unit concepts
- Goal: Test understanding of key definitions and principles
- Steps: Explanation of question format and scoring
- WorkedExample: Sample multiple-choice with reasoning
- PracticeSet: 5-10 multiple-choice questions with hints
- Check: Self-assessment quiz with answer key
- Recap: Summary of what was tested

**quiz-short.mdx**:
- Similar structure with short answer prompts
- Focus on brief explanations (1-3 sentences)
- WorkedExample shows model answer format
- PracticeSet: 3-5 short answer questions
- Check: Rubric-based self-assessment

**quiz-code.mdx** (for applicable tracks):
- Programming/algorithmic exercises
- WorkedExample: Starter code and expected output
- PracticeSet: 1-2 coding problems with test cases
- Check: Instructions for self-testing solution

### Project Lesson Details
**project-plan.mdx**:
- Hook: Real-world problem this project solves
- Goal: Clear requirements and success criteria
- Steps: Breakdown of project phases
- WorkedExample: Similar project or component
- PracticeSet: Clarifying questions about requirements
- Check: Requirements validation checklist
- Recap: Overview of what will be built

**project-build.mdx**:
- Goal: Implementation approach and milestones
- Steps: Detailed build instructions
- WorkedExample: Code snippets for complex parts
- PracticeSet: Implementation checkpoints
- Build verification steps
- Common pitfalls and solutions

**project-test.mdx**:
- Goal: Evaluation criteria and testing approach
- Steps: How to verify correctness
- WorkedExample: Test cases and expected results
- PracticeSet: Self-assessment exercises
- Check: Evaluation rubric with mastery levels
- Recap: Next steps and related concepts

## Error Handling and Validation

### Build-Time Checks
- Frontmatter validation during MDX parsing
- Link validation for internal references
- Component import validation
- Bilingual consistency checks via linter

### Runtime Considerations
- All lessons are static content - no runtime errors expected
- Quiz answers and project rubrics provide immediate feedback
- Estimated times help learners manage pace

### Edge Cases
- Tracks without coding components (math) skip quiz-code.mdx
- Placeholder frontmatter for future localization
- Graceful handling of tracks with varying lesson counts

## Testing and Verification

### Linter Compliance
- Text budgets enforced (Crux ≤140, KeyTakeaway ≤220, etc.)
- Hydration cap ≤5 islands per page
- i18n parity verified between EN/RU versions
- Required sources and glossary terms

### Manual Verification
- Visual check of rendered EN/RU pages
- Interactive component functionality
- Link validation throughout lessons
- Build success with `bun run build`

### Content Review
- Concept alignment with unit crux and goals
- Difficulty appropriate for track level
- Clear instructions and achievable exercises
- Answer keys and rubrics for self-assessment