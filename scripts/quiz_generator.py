#!/usr/bin/env python3
"""
Quiz generator script for the curriculum site.

This script scans the lessons directory for quiz stubs and zero-level orientation units.
"""

import os
import re
import json
import requests
from pathlib import Path


def find_quiz_stubs(base_path):
    """Find all quiz stub directories (quiz-choice, quiz-short, quiz-code)."""
    quiz_stubs = []
    for root, dirs, files in os.walk(base_path):
        for dir_name in dirs:
            if dir_name in ['quiz-choice', 'quiz-short', 'quiz-code']:
                full_path = os.path.join(root, dir_name)
                quiz_stubs.append(full_path)
    return quiz_stubs


def find_zero_level_units(base_path):
    """Find all 00-orientation directories."""
    zero_level = []
    for root, dirs, files in os.walk(base_path):
        for dir_name in dirs:
            if dir_name == '00-orientation':
                full_path = os.path.join(root, dir_name)
                zero_level.append(full_path)
    return zero_level


def extract_concepts_from_frontmatter(content):
    """Extract concepts from frontmatter (between --- lines)."""
    concepts = set()
    # Find frontmatter: assumes it starts at beginning and ends with first '---' after start.
    if content.startswith('---'):
        # Find the end of frontmatter
        end_match = content.find('\n---\n', 3)
        if end_match != -1:
            frontmatter = content[3:end_match]
            # Parse frontmatter for concepts: look for 'concepts:' line and then indented list
            lines = frontmatter.split('\n')
            in_concepts = False
            for line in lines:
                stripped = line.strip()
                if stripped.startswith('concepts:'):
                    in_concepts = True
                    # Check if there's a list on the same line (unlikely but handle)
                    after_colon = stripped[len('concepts:'):].strip()
                    if after_colon.startswith('['):
                        # Inline list, we could parse but for simplicity, we'll skip and rely on next lines
                        pass
                    elif after_colon:
                        # Single item? Not typical, but we'll treat as one concept
                        concepts.add(after_colon.strip('- '))
                    continue
                if in_concepts:
                    if stripped.startswith('-'):
                        concept = stripped[1:].strip()
                        concepts.add(concept)
                    elif stripped == '' or not stripped.startswith(' '):
                        # End of the list (either empty line or a new key without indentation)
                        break
    return concepts


def extract_concepts_from_content(content):
    """Extract concepts from content: inline code and capitalized terms."""
    concepts = set()
    # Inline code: `...`
    code_matches = re.findall(r'`([^`]+)`', content)
    for match in code_matches:
        # Clean up: remove extra spaces, but keep as is
        concepts.add(match.strip())
    # Capitalized terms: sequences of uppercase letters, possibly hyphenated, length >=2
    # Pattern: \b[A-Z]{2,}(?:-[A-Z]{2,})*\b
    cap_matches = re.findall(r'\b[A-Z]{2,}(?:-[A-Z]{2,})*\b', content)
    for match in cap_matches:
        concepts.add(match)
    return concepts


def extract_concepts_from_lesson(lesson_path):
    """Extract all concepts from a lesson's index.mdx."""
    index_file = os.path.join(lesson_path, 'index.mdx')
    if not os.path.isfile(index_file):
        return set()
    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()
    frontmatter_concepts = extract_concepts_from_frontmatter(content)
    content_concepts = extract_concepts_from_content(content)
    return frontmatter_concepts.union(content_concepts)


def extract_concepts_from_unit(unit_path):
    """Extract concepts from all non-quiz lessons in a unit."""
    all_concepts = set()
    # Skip quiz stub directories
    skip_dirs = {'quiz-choice', 'quiz-code', 'quiz-short'}
    for item in os.listdir(unit_path):
        item_path = os.path.join(unit_path, item)
        if os.path.isdir(item_path) and item not in skip_dirs:
            # This is a lesson directory (including project-build, etc.)
            lesson_concepts = extract_concepts_from_lesson(item_path)
            all_concepts.update(lesson_concepts)
    return all_concepts


def generate_quiz_with_llm(concepts, quiz_type, unit_title):
    """
    Generate quiz questions using LLM based on extracted concepts.

    Args:
        concepts: Set of concept strings extracted from the unit
        quiz_type: Type of quiz ('quiz-choice', 'quiz-short', 'quiz-code')
        unit_title: Title of the unit for context

    Returns:
        Dictionary with quiz data or None if generation failed
    """
    # Prepare concepts list for the prompt
    concepts_list = list(concepts)[:20]  # Limit to prevent too long prompts

    # Different prompts for different quiz types
    if quiz_type == 'quiz-choice':
        prompt = f"""Generate a multiple choice question for a senior fullstack engineering curriculum unit titled "{unit_title}".

        Based on these key concepts: {', '.join(concepts_list)}

        Create a question that tests deep understanding (mechanism, tradeoffs, failure modes, or numbers - not just definitions).
        Provide 4 options (A, B, C, D) with one correct answer.

        Your response MUST be ONLY a valid JSON object with this exact structure:
        {{
            "question": "Your question here",
            "options": {{"A": "Option A text", "B": "Option B text", "C": "Option C text", "D": "Option D text"}},
            "correct": "A",
            "explanation": "Brief explanation why this is correct and others are wrong"
        }}

        Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
        """
    elif quiz_type == 'quiz-short':
        prompt = f"""Generate a short answer question for a senior fullstack engineering curriculum unit titled "{unit_title}".

        Based on these key concepts: {', '.join(concepts_list)}

        Create a question that requires a brief answer (1-3 sentences) testing deep understanding.
        Provide the expected answer and key points that should be included.

        Your response MUST be ONLY a valid JSON object with this exact structure:
        {{
            "question": "Your question here",
            "expected_answer": "Expected answer text",
            "key_points": ["Point 1", "Point 2", "Point 3"]
        }}

        Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
        """
    elif quiz_type == 'quiz-code':
        prompt = f"""Generate a code-based question for a senior fullstack engineering curriculum unit titled "{unit_title}".

        Based on these key concepts: {', '.join(concepts_list)}

        Create a question that requires writing or analyzing code to demonstrate understanding.
        Provide the prompt and what a good answer should include.

        Your response MUST be ONLY a valid JSON object with this exact structure:
        {{
            "question": "Your question here (describe what code to write or analyze)",
            "expected_content": ["Key point 1 that should be in the code", "Key point 2", "Key point 3"],
            "evaluation_criteria": ["Criteria 1", "Criteria 2", "Criteria 3"]
        }}

        Do NOT include any explanation, preamble, or extra text. Output ONLY the JSON.
        """
    else:
        return None

    # Call the LLM API
    url = 'http://localhost:8082/v1/messages'
    headers = {
        'x-api-key': 'freecc',
        'Content-Type': 'application/json'
    }

    data = {
        'model': 'claude-3-5-sonnet-20241022',
        'max_tokens': 500,
        'messages': [{
            'role': 'user',
            'content': prompt
        }]
    }

    try:
        response = requests.post(url, headers=headers, json=data, stream=True)
        response.raise_for_status()

        full_text = ''
        for line in response.iter_lines():
            if line:
                line_text = line.decode('utf-8')
                # Extract text content from streaming response
                if line_text.startswith('data: '):
                    try:
                        # Remove 'data: ' prefix and parse JSON
                        json_str = line_text[6:]
                        data_obj = json.loads(json_str)
                        # Check for text content in thinking_delta or text_delta
                        if 'delta' in data_obj:
                            delta = data_obj['delta']
                            # Handle thinking_delta (contains reasoning) and text_delta (contains actual response)
                            if 'text' in delta:
                                full_text += delta['text']
                    except (json.JSONDecodeError, KeyError):
                        pass

        # Try to parse the JSON from the accumulated text
        try:
            # Find JSON-like content in the accumulated text
            # The LLM often gives a preamble, so we need to find the JSON within the text
            import re

            # Strategy 1: Look for the first complete JSON object (from first { to matching })
            start = full_text.find('{')
            if start != -1:
                # Find the matching closing brace
                brace_count = 0
                end = start
                for i in range(start, len(full_text)):
                    char = full_text[i]
                    if char == '{':
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0:
                            end = i + 1
                            break

                if brace_count == 0:  # Found完整的JSON
                    json_str = full_text[start:end]
                    try:
                        result = json.loads(json_str)
                        return result
                    except json.JSONDecodeError:
                        pass  # Fall through to other strategies

            # Strategy 2: Look for JSON-like patterns using regex
            json_patterns = [
                r'\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}',  # Handle nested braces up to 3 levels
                r'\{[^{}]*\}',                                # Simple non-nested braces
            ]

            for pattern in json_patterns:
                matches = re.findall(pattern, full_text, re.DOTALL)
                # Try matches in reverse order (longest first) as they're more likely to be the actual JSON
                for match in reversed(matches):
                    try:
                        result = json.loads(match)
                        return result
                    except json.JSONDecodeError:
                        continue

            # Strategy 3: Last resort - try to parse the whole text as JSON
            try:
                result = json.loads(full_text)
                return result
            except json.JSONDecodeError:
                pass

            # If all strategies fail, use fallback generation
            print(f'Warning: LLM did not return valid JSON for {quiz_type}, using fallback')
            print('Response preview:', full_text[:200])
            return generate_fallback_quiz(concepts, quiz_type, unit_title)
        except Exception as e:
            print(f'Error calling LLM API: {e}')
            return generate_fallback_quiz(concepts, quiz_type, unit_title)

    except Exception as e:
        print(f'Error calling LLM API: {e}')
        return generate_fallback_quiz(concepts, quiz_type, unit_title)


def generate_fallback_quiz(concepts, quiz_type, unit_title):
    """
    Generate a fallback quiz when LLM fails to produce valid JSON.

    Args:
        concepts: Set of concept strings
        quiz_type: Type of quiz
        unit_title: Unit title

    Returns:
        Dictionary with quiz data
    """
    concepts_list = list(concepts)
    if not concepts_list:
        concepts_list = ["concept"]

    if quiz_type == 'quiz-choice':
        # Generate a simple multiple choice question
        concept = concepts_list[0] if concepts_list else "the topic"
        return {
            "question": f"What is a key aspect of {concept} in the context of {unit_title}?",
            "options": {
                "A": f"It involves understanding the fundamental mechanisms and tradeoffs",
                "B": f"It is only relevant for junior developers",
                "C": f"It has no practical applications in real systems",
                "D": f"It is purely theoretical with no implementation details"
            },
            "correct": "A",
            "explanation": f"Option A correctly identifies that understanding {concept} requires grasping both mechanisms and tradeoffs, which is essential for senior level understanding."
        }
    elif quiz_type == 'quiz-short':
        concept = concepts_list[0] if concepts_list else "the topic"
        return {
            "question": f"Explain how {concept} relates to {unit_title} and why it's important for senior engineers to understand.",
            "expected_answer": f"A senior engineer should understand both the mechanisms of {concept} and its tradeoffs in real-world applications.",
            "key_points": [
                f"Understanding the fundamental mechanisms of {concept}",
                "Recognizing the tradeoffs involved in different approaches",
                "Applying this knowledge to solve real engineering problems"
            ]
        }
    elif quiz_type == 'quiz-code':
        concept = concepts_list[0] if concepts_list else "the topic"
        return {
            "question": f"Write code or describe an implementation that demonstrates understanding of {concept} in {unit_title}.",
            "expected_content": [
                f"Clear demonstration of {concept} principles",
                "Consideration of performance tradeoffs",
                "Error handling and edge cases"
            ],
            "evaluation_criteria": [
                "Correct implementation of the concept",
                "Code quality and readability",
                "Addresses tradeoffs mentioned in the unit"
            ]
        }
    else:
        # Default fallback
        return {
            "question": f"What is important to know about {concepts_list[0] if concepts_list else 'this topic'}?",
            "options": {
                "A": "Understanding both mechanisms and tradeoffs",
                "B": "Only memorizing definitions",
                "C": "Avoiding complexity",
                "D": "Following trends blindly"
            },
            "correct": "A",
            "explanation": "Senior engineers must understand both how things work and the tradeoffs involved in different approaches."
        }


def update_quiz_file(quiz_path, quiz_data, quiz_type):
    """
    Update a quiz index.mdx file with generated content.

    Args:
        quiz_path: Path to the quiz directory
        quiz_data: Dictionary with quiz data from LLM
        quiz_type: Type of quiz ('quiz-choice', 'quiz-short', 'quiz-code')
    """
    index_file = os.path.join(quiz_path, 'index.mdx')

    # Read existing file to preserve frontmatter and imports
    with open(index_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split content to find where to insert quiz
    parts = content.split('---', 2)
    if len(parts) < 3:
        print(f"Warning: Could not parse frontmatter in {index_file}")
        return

    frontmatter = parts[0] + '---' + parts[1] + '---'
    rest = parts[2]

    # Generate appropriate quiz content based on type
    if quiz_type == 'quiz-choice':
        # Extract unit title from path for ID generation
        unit_slug = quiz_path.split('/')[-2]
        # Build choices with proper escaping
        choice_a = json.dumps(quiz_data['options']['A'])[1:-1]
        choice_b = json.dumps(quiz_data['options']['B'])[1:-1]
        choice_c = json.dumps(quiz_data['options']['C'])[1:-1]
        choice_d = json.dumps(quiz_data['options']['D'])[1:-1]
        correct_a = str(quiz_data['correct'] == 'A').lower()
        correct_b = str(quiz_data['correct'] == 'B').lower()
        correct_c = str(quiz_data['correct'] == 'C').lower()
        correct_d = str(quiz_data['correct'] == 'D').lower()
        # Build choices string manually to avoid f-string brace escaping issues
        choices_str = f'[{{ label: "{choice_a}", correct: {correct_a} }}, {{ label: "{choice_b}", correct: {correct_b} }}, {{ label: "{choice_c}", correct: {correct_c} }}, {{ label: "{choice_d}", correct: {correct_d} }}]'
        quiz_component = f'''<Quiz
  id="{unit_slug}-quiz-1"
  lessonSlug="{unit_slug}"
  lang="en"
  question="{json.dumps(quiz_data['question'])[1:-1]}"
  choices={choices_str}
/>'''

        # Add explanation as an inset
        explanation_inset = f'''<Inset kind="note" lang="en">
  Explanation: {json.dumps(quiz_data['explanation'])[1:-1]}
</Inset>'''

        quiz_block = quiz_component + '\n\n' + explanation_inset

    elif quiz_type == 'quiz-short':
        unit_slug = quiz_path.split('/')[-2]
        quiz_component = f'''<Quiz
  id="{unit_slug}-quiz-1"
  lessonSlug="{unit_slug}"
  lang="en"
  question="{json.dumps(quiz_data['question'])[1:-1]}"
  /* This is a short answer question - expected answer: {json.dumps(quiz_data['expected_answer'])[1:-1]} */
  /* Key points: {', '.join(quiz_data['key_points'])} */
 />'''
        quiz_block = quiz_component

    elif quiz_type == 'quiz-code':
        unit_slug = quiz_path.split('/')[-2]
        quiz_component = f'''<Quiz
  id="{unit_slug}-quiz-1"
  lessonSlug="{unit_slug}"
  lang="en"
  question="{json.dumps(quiz_data['question'])[1:-1]}"
  /* Expected content: {', '.join(quiz_data['expected_content'])} */
  /* Evaluation criteria: {', '.join(quiz_data['evaluation_criteria'])} */
 />'''
        quiz_block = quiz_component

    # Insert after the Recap component or at the end before closing
    if '<Recap' in rest:
        # Insert after Recap ends
        insert_pos = rest.find('</Recap>') + len('</Recap>')
        new_rest = rest[:insert_pos] + '\n\n' + quiz_block + rest[insert_pos:]
    else:
        # Append at the end
        new_rest = rest + '\n\n' + quiz_block

    new_content = frontmatter + new_rest

    # Write back if changed
    if new_content != content:
        with open(index_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {index_file}")
    else:
        print(f"No changes needed for {index_file}")


def main():
    lessons_base = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons'

    print("Finding quiz stubs...")
    quiz_stubs = find_quiz_stubs(lessons_base)
    print(f"Found {len(quiz_stubs)} quiz stubs:")
    for stub in quiz_stubs[:10]:  # Show first 10
        print(f"  {stub}")
    if len(quiz_stubs) > 10:
        print(f"  ... and {len(quiz_stubs) - 10} more")

    print("\nFinding zero-level orientation units...")
    zero_level = find_zero_level_units(lessons_base)
    print(f"Found {len(zero_level)} zero-level units:")
    for unit in zero_level[:10]:  # Show first 10
        print(f"  {unit}")
    if len(zero_level) > 10:
        print(f"  ... and {len(zero_level) - 10} more")

    # Test concept extraction and quiz generation on a sample unit
    test_unit = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/performance/04-gc'
    if os.path.isdir(test_unit):
        print(f"\nExtracting concepts from unit: {test_unit}")
        concepts = extract_concepts_from_unit(test_unit)
        print(f"Found {len(concepts)} unique concepts")

        # Get unit title from the main lesson
        unit_title = "GC algorithms: generational, concurrent, and per-runtime"
        for item in os.listdir(test_unit):
            item_path = os.path.join(test_unit, item)
            if os.path.isdir(item_path) and item not in ['quiz-choice', 'quiz-short', 'quiz-code', 'project-build', 'project-plan', 'project-test']:
                index_file = os.path.join(item_path, 'index.mdx')
                if os.path.isfile(index_file):
                    with open(index_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                        # Extract title from frontmatter
                        if 'title:' in content:
                            lines = content.split('\n')
                            for line in lines:
                                if line.strip().startswith('title:'):
                                    title_line = line.split('title:', 1)[1].strip()
                                    # Remove quotes and dashes
                                    unit_title = title_line.strip().strip('\"\'')
                                    break
                    break

        print(f"Unit title: {unit_title}")

        # Test generating each quiz type
        for quiz_type in ['quiz-choice', 'quiz-short', 'quiz-code']:
            quiz_stub_path = os.path.join(test_unit, quiz_type)
            if os.path.isdir(quiz_stub_path):
                print(f"\nGenerating {quiz_type}...")
                quiz_data = generate_quiz_with_llm(concepts, quiz_type, unit_title)
                if quiz_data:
                    print(f"Generated {quiz_type} data:")
                    print(json.dumps(quiz_data, indent=2))
                    update_quiz_file(quiz_stub_path, quiz_data, quiz_type)
                else:
                    print(f"Failed to generate {quiz_type}")
    else:
        print(f"\nTest unit not found: {test_unit}")


if __name__ == '__main__':
    main()