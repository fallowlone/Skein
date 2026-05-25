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

        # Match: key: value
        match = re.match(r"^(\s*)(.+?)\s*:\s*(.*)\s*$", line_content)
        if not match:
            # Not a key-value line, keep as is
            processed_frontmatter.append(line)
            continue

        indent, key, value = match.groups()

        # Check if the value is a quoted string (single or double quotes)
        quoted_string_match = re.match(r"^(['\"])(.*)\1$", value)
        if quoted_string_match:
            quote_char, inner = quoted_string_match.groups()
            # Escape single quotes in the inner string by doubling
            escaped_inner = inner.replace("'", "''")
            # Reconstruct the value with single quotes
            new_value = f"'{escaped_inner}'"
            new_line_content = f"{indent}{key}: {new_value}"
            processed_frontmatter.append(new_line_content + newline)
        else:
            # Not a quoted string, keep the line as is
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