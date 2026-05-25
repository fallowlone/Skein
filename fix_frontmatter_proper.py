#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_content(content):
    """Escape single quotes in content by doubling them for YAML single-quoted string."""
    return content.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If it's a key: value where value is a quoted string, we process it.
    Otherwise, return the line unchanged.
    """
    # Match: ^(\s*)(.+?)\s*:\s*(.*)$
    match = re.match(r'^(\s*)(.+?)\s*:\s*(.*)$', line)
    if not match:
        return line

    leading, key, value_part = match.groups()

    # Check if value_part is a quoted string (starts and ends with same quote, either ' or ")
    if len(value_part) >= 2 and value_part[0] == value_part[-1] and value_part[0] in "\"'":
        quote_char = value_part[0]
        # Extract the content between the quotes
        content = value_part[1:-1]
        # Escape single quotes in the content
        escaped_content = escape_single_quotes_in_content(content)
        # We will output as a single-quoted string
        new_value_part = f"'{escaped_content}'"
        # Reconstruct the line with the same leading whitespace, key, colon, space, and new value part
        # But preserve any trailing whitespace that was in value_part? We'll ignore for simplicity.
        # The value_part may have had leading/trailing spaces inside the quotes? We stripped the quotes.
        # We are replacing the entire value_part with our new quoted string.
        return f"{leading}{key}: {new_value_part}"
    else:
        # Not a quoted string, return the line as is
        return line

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