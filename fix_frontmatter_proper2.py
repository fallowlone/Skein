#!/usr/bin/env python3
import os
import re
import sys

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If the value is a quoted string (single or double quotes), we escape single quotes in the content by doubling them
    and output as a single-quoted string.
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

    # Match: ^(\s*)(.+?)\s*:\s*(.*)$
    match = re.match(r'^(\s*)(.+?)\s*:\s*(.*)$', line_to_process)
    if not match:
        # Return the original line (with its newline if any)
        return line

    leading, key, value_part = match.groups()

    # Check if value_part is a quoted string (starts and ends with same quote, either ' or ")
    if len(value_part) >= 2 and value_part[0] == value_part[-1] and value_part[0] in "\"'":
        quote_char = value_part[0]
        # Extract the content between the quotes
        content = value_part[1:-1]
        # Escape single quotes in the content by doubling them
        escaped_content = content.replace("'", "''")
        # We will output as a single-quoted string
        new_value_part = f"'{escaped_content}'"
        # Reconstruct the line without the newline
        new_line_without_newline = f"{leading}{key}: {new_value_part}"
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