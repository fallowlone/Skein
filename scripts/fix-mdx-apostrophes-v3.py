#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_file(filepath):
    """Process a single .mdx file."""
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Check if file starts with a frontmatter delimiter
    if len(lines) < 3 or lines[0].strip() != '---':
        return False

    # Find the closing delimiter
    second_dash_idx = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            second_dash_idx = i
            break

    if second_dash_idx is None:
        return False

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

        # Match: key: 'value'
        match = re.match(r"^(\s*)(.+?)\s*:\s*'(.*)'\s*$", line_content)
        if match:
            indent, key, value = match.groups()
            # Escape single quotes in the value
            new_value = escape_single_quotes_in_string(value)
            new_line_content = f"{indent}{key}: '{new_value}'"
            processed_frontmatter.append(new_line_content + newline)
        else:
            # Keep non-matching lines as is
            processed_frontmatter.append(line)

    # Reassemble the file
    new_lines = [
        lines[0],                   # opening '---'
    ] + processed_frontmatter + [
        lines[second_dash_idx],     # closing '---'
    ] + lines[second_dash_idx+1:]   # rest of the file

    new_content = ''.join(new_lines)
    original_content = ''.join(lines)

    if new_content != original_content:
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