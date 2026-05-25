#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_lines(lines):
    """Process each line of frontmatter, escaping single quotes in single-quoted string values."""
    processed = []
    for line in lines:
        # Match lines that have a key, colon, optional space, single quote, then any characters (non-greedy) until a single quote, then optional whitespace.
        # We capture: (indent)(key): 'value'
        match = re.match(r"^(\s*)(.+?)\s*:\s*'(.*)'\s*$", line)
        if match:
            indent, key, value = match.groups()
            # Escape single quotes in the value
            new_value = escape_single_quotes_in_string(value)
            new_line = f"{indent}{key}: '{new_value}'\n"
            processed.append(new_line)
        else:
            # If it doesn't match our pattern, keep the line as is.
            processed.append(line)
    return processed

def process_file(filepath):
    """Process a single .mdx file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Split by '---' to isolate frontmatter, maxsplit=2 to get three parts.
    parts = content.split('---', 2)
    if len(parts) < 3:
        # No proper frontmatter found, skip
        return False

    # parts[0] is before the first '---' (usually empty if file starts with ---)
    # parts[1] is the frontmatter (the text between the first and second '---')
    # parts[2] is everything after the second '---'
    frontmatter_text = parts[1]
    rest = parts[2]

    # Process frontmatter line by line
    lines = frontmatter_text.splitlines(keepends=True)  # Keep line endings
    new_lines = process_frontmatter_lines(lines)
    new_frontmatter = ''.join(new_lines)

    # Reassemble content
    new_content = f"---\n{new_frontmatter}---\n{rest}"

    # Write back if changed
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")
        return True
    else:
        print(f"No changes: {filepath}")
        return False

def main():
    lessons_dir = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons'
    if not os.path.isdir(lessons_dir):
        print(f"Directory not found: {lessons_dir}")
        sys.exit(1)

    updated_count = 0
    total_count = 0

    for root, dirs, files in os.walk(lessons_dir):
        for file in files:
            if file.endswith('.mdx'):
                filepath = os.path.join(root, file)
                total_count += 1
                if process_file(filepath):
                    updated_count += 1

    print(f"\nProcessed {total_count} .mdx files, updated {updated_count}.")

if __name__ == '__main__':
    main()