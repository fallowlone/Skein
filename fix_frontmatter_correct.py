#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If it's a double-quoted string, convert to single-quoted and escape single quotes.
    If it's a single-quoted string, escape single quotes.
    Otherwise, return the line unchanged.
    Preserves the line ending (newline).
    """
    # Check for newline at the end
    if line.endswith('\n'):
        has_newline = True
        line_to_process = line[:-1]
    else:
        has_newline = False
        line_to_process = line

    # Pattern for double-quoted string: key: "value"
    match_double = re.match(r'^(\s*)(.+?)\s*:\s*"(.*)"\s*$', line_to_process)
    if match_double:
        indent, key, value = match_double.groups()
        # Escape single quotes in the value
        new_value = escape_single_quotes_in_string(value)
        # Convert to single-quoted string
        new_line_without_newline = f"{indent}{key}: '{new_value}'"
    else:
        # Pattern for single-quoted string: key: 'value'
        match_single = re.match(r"^(\s*)(.+?)\s*:\s*'(.*)'\s*$", line_to_process)
        if match_single:
            indent, key, value = match_single.groups()
            # Escape single quotes in the value
            new_value = escape_single_quotes_in_string(value)
            new_line_without_newline = f"{indent}{key}: '{new_value}'"
        else:
            # Not a quoted string, return the line as is (without newline)
            new_line_without_newline = line_to_process

    # Add back the newline if it was present
    if has_newline:
        return new_line_without_newline + '\n'
    else:
        return new_line_without_newline

def process_file(filepath):
    """Process a single .mdx file."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Check if file starts with a frontmatter delimiter
    if len(lines) < 3 or lines[0].strip() != '---':
        return False, lines

    # Find the closing delimiter
    second_dash_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            second_dash_idx = i
            break

    if second_dash_idx is None:
        return False, lines

    # Process frontmatter lines (between the delimiters)
    processed_frontmatter = []
    for line in lines[1:second_dash_idx]:
        processed_frontmatter.append(process_frontmatter_line(line))

    # Reassemble the file
    new_lines = [
        lines[0],                   # opening '---'
    ] + processed_frontmatter + [
        lines[second_dash_idx],     # closing '---'
    ] + lines[second_dash_idx+1:]   # rest of the file

    new_content = ''.join(new_lines)
    original_content = ''.join(lines)

    return new_content != original_content, new_lines

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
                changed, _ = process_file(filepath)
                if changed:
                    updated_count += 1

    print(f"\nProcessed {total_count} .mdx files, updated {updated_count}.")

if __name__ == '__main__':
    main()