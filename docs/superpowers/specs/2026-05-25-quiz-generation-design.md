# Quiz Generation and Zero-Level Removal Design

## Problem Statement
The curriculum site contains quiz stubs (placeholder files) in many units across tracks. Additionally, there are zero-level orientation lessons (00-orientation) that are intended for absolute beginners, but the user wants to exclude these from the curriculum entirely.

## Goals
1. Replace all quiz stubs with full quizzes generated from unit concepts.
2. Remove all zero-level orientation lessons (00-orientation directories) from both English and Russian content.
3. Update track and unit metadata to reflect the removal of zero-level units.
4. Ensure generated quizzes adhere to the depth bar (middle+/senior fullstack engineer) and include mechanism, tradeoffs, failure modes, and numbers where appropriate.

## Approach
Use an LLM to generate quiz questions based on the concepts extracted from each unit's lessons. For each unit:
- Extract concepts from non-quiz lessons (e.g., from frontmatter and content).
- Prompt the LLM to create multiple-choice, code-based, and short-answer questions that test understanding of the concepts.
- Replace the existing quiz stub files (quiz-choice/index.mdx, quiz-code/index.mdx, quiz-short/index.mdx) with the generated content.
- Delete the 00-orientation directories for each track.
- Adjust the order of units in tracks.json and units.json to remove the zero-level units and renumber accordingly.

## Steps
1. **Identify all units with quiz stubs**:
   - Find directories named `quiz-*` under `site/src/content/lessons`.
   - For each, determine the parent unit (e.g., `site/src/content/lessons/en/performance/04-gc`).

2. **Generate quiz content per unit**:
   - For each unit, read all non-quiz lessons (skip any `quiz-*` directories).
   - Extract concepts from frontmatter and look for key terms in the content.
   - Construct a prompt for the LLM to generate three quiz types:
     - `quiz-choice`: Multiple choice questions with distractors.
     - `quiz-code`: Code-based questions (e.g., debugging, output prediction).
     - `quiz-short`: Short answer or fill-in-the-blank.
   - Ensure questions are at the middle+/senior depth bar.
   - Write generated content to the respective quiz directories.

3. **Remove zero-level lessons**:
   - For each track in `tracks.json`, remove the unit with slug `00-orientation` (if present).
   - Delete the corresponding directories: `site/src/content/lessons/{en,ru}/<track>/00-orientation`.

4. **Update metadata**:
   - In `tracks.json`, remove the zero-level unit object from the array.
   - Renumber the `order` fields of remaining units to be sequential starting from 1.
   - In `units.json`, remove entries for the zero-level units.
   - Adjust any `prereqs` that reference deleted units.

5. **Verify and lint**:
   - Run `bun run build` in the `site` directory to ensure no MDX/JSX errors and linter passes.
   - Manually spot-check a few generated quizzes for quality.

## Expected Outcome
- All quiz stubs replaced with meaningful quizzes that reinforce unit concepts.
- Zero-level lessons completely removed from the curriculum.
- Updated track and unit metadata reflecting the new structure.
- The curriculum site builds successfully and meets linting rules.

## Risks and Mitigations
- **Risk**: Generated quizzes may not align with the depth bar or may contain inaccuracies.
  - **Mitigation**: Review a sample of generated quizzes; adjust LLM prompts as needed.
- **Risk**: Removing zero-level lessons may break prerequisites for other units.
  - **Mitigation**: Check that no unit has a prerequisite on a zero-level unit; if so, either remove the prerequisite or replace it with a more advanced unit.
- **Risk**: Lint errors due to changes in quiz content.
  - **Mitigation**: Run the linter after generation and fix any issues (e.g., text budget violations).

## Notes
- The quiz generation will use the LLM via the available MCP servers (context7 for documentation if needed, but primarily relying on the model's internal knowledge).
- The design assumes that each unit has sufficient conceptual material in its lessons to generate quizzes.
- If a unit lacks sufficient concepts, we may need to fallback to manual creation or skip, but given the curriculum's depth, this is unlikely.