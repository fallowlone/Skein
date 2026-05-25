#!/usr/bin/env python3
import os
import re

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If it's a double-quoted string, convert to single-quoted and escape single quotes.
    If it's a single-quoted string, escape single quotes.
    Otherwise, return the line unchanged.
    """
    # Pattern for double-quoted string: key: "value"
    match_double = re.match(r'^(\s*)(.+?)\s*:\s*"(.*)"\s*$', line)
    if match_double:
        indent, key, value = match_double.groups()
        # Escape single quotes in the value
        new_value = escape_single_quotes_in_string(value)
        # Convert to single-quoted string
        new_line = f"{indent}{key}: '{new_value}'\n"
        return new_line

    # Pattern for single-quoted string: key: 'value'
    match_single = re.match(r"^(\s*)(.+?)\s*:\s*'(.*)'\s*$", line)
    if match_single:
        indent, key, value = match_single.groups()
        # Escape single quotes in the value
        new_value = escape_single_quotes_in_string(value)
        new_line = f"{indent}{key}: '{new_value}'\n"
        return new_line

    # If it doesn't match either pattern, return the line as is
    return line

def process_file(filepath):
    """Process a single .mdx file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Split by '---' to isolate frontmatter, maxsplit=2 to get three parts.
    parts = content.split('---', 2)
    if len(parts) < 3:
        # No proper frontmatter found, skip
        return False, content

    # parts[0] is before the first '---' (usually empty if file starts with ---)
    # parts[1] is the frontmatter (the text between the first and second '---')
    # parts[2] is everything after the second '---'
    frontmatter_text = parts[1]
    rest = parts[2]

    # Process frontmatter line by line
    lines = frontmatter_text.splitlines(keepends=True)  # Keep line endings
    new_lines = []
    for line in lines:
        new_lines.append(process_frontmatter_line(line))
    new_frontmatter = ''.join(new_lines)

    # Reassemble content
    new_content = f"---\n{new_frontmatter}---\n{rest}"

    # Write back if changed
    if new_content != content:
        return True, new_content
    else:
        return False, content

if __name__ == '__main__':
    filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-build/index.mdx'
    changed, new_content = process_file(filepath)
    if changed:
        print("Changed")
        print("--- New content ---")
        print(new_content)
    else:
        print("Not changed")