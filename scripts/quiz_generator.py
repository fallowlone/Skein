#!/usr/bin/env python3
"""
Quiz generator script for the curriculum site.

This script scans the lessons directory for quiz stubs and zero-level orientation units.
"""

import os
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

if __name__ == '__main__':
    main()