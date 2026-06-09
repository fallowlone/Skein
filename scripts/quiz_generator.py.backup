#!/usr/bin/env python3
"""
Quiz generator script for the curriculum site.

This script scans the lessons directory for quiz stubs and zero-level orientation units.
"""

import os
import re
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

    # Test concept extraction on performance/04-gc unit
    test_unit = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/performance/04-gc'
    if os.path.isdir(test_unit):
        print(f"\nExtracting concepts from unit: {test_unit}")
        concepts = extract_concepts_from_unit(test_unit)
        print(f"Found {len(concepts)} unique concepts:")
        for concept in sorted(concepts):
            print(f"  {concept}")
    else:
        print(f"\nTest unit not found: {test_unit}")

if __name__ == '__main__':
    main()