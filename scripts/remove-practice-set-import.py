#!/usr/bin/env python3
import os
import sys
from pathlib import Path

def remove_practice_set_import(content):
    """
    Remove lines that import PracticeSet from the lesson components.
    We'll match lines that contain:
        import PracticeSet from "~/components/lesson/PracticeSet.astro";
    and remove them.
    """
    lines = content.split('\n')
    new_lines = []
    removed = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('import PracticeSet from') and 'PracticeSet.astro' in stripped and stripped.endswith(';'):
            removed = True
            continue
        new_lines.append(line)
    if removed:
        return '\n'.join(new_lines), True
    else:
        return content, False

def process_file(filepath):
    """
    Process a single .mdx file.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content, changed = remove_practice_set_import(content)

    # Write back if changed
    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    else:
        return False

def main():
    lessons_dir = Path('/Users/artemmac/dev/awesome-everything/site/src/content/lessons')
    if not lessons_dir.exists():
        print(f"Directory not found: {lessons_dir}")
        sys.exit(1)

    mdx_files = list(lessons_dir.rglob('*.mdx'))
    print(f"Found {len(mdx_files)} .mdx files")

    processed_count = 0
    for mdx_file in mdx_files:
        if process_file(mdx_file):
            print(f"Processed: {mdx_file}")
            processed_count += 1

    print(f"Total files processed: {processed_count}")

if __name__ == '__main__':
    main()