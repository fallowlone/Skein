#!/usr/bin/env python3
import os
import re
import sys

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
        # Preserve line ending
        if line.endswith('\n'):
            line_content = line[:-1]
            newline = '\n'
        else:
            line_content = line
            newline = ''

        # Try to match double-quoted string: key: "value"
        match_double = re.match(r'^(\s*)(.+?)\s*:\s*"(.*)"\s*$', line_content)
        if match_double:
            indent, key, value = match_double.groups()
            # Escape single quotes in the value by doubling
            new_value = value.replace("'", "''")
            new_line_content = f"{indent}{key}: '{new_value}'"
            processed_frontmatter.append(new_line_content + newline)
            continue

        # Try to match single-quoted string: key: 'value'
        match_single = re.match(r"^(\s*)(.+?)\s*:\s*'(.*)'\s*$", line_content)
        if match_single:
            indent, key, value = match_single.groups()
            # Escape single quotes in the value by doubling
            new_value = value.replace("'", "''")
            new_line_content = f"{indent}{key}: '{new_value}'"
            processed_frontmatter.append(new_line_content + newline)
            continue

        # If no match, keep the line as is
        processed_frontmatter.append(line)

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