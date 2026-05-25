#!/usr/bin/env python3
import os
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_lines(lines):
    """Process each line of frontmatter, escaping single quotes in single-quoted string values."""
    processed = []
    for line in lines:
        # We want to match lines that have a key, colon, optional space, single quote, then any characters (non-greedy) until a single quote, then optional whitespace.
        # We capture: (indent)(key): 'value'
        # We use a regex that matches the entire line.
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
        lines = f.readlines()

    # Check if the file starts with a frontmatter delimiter
    if not lines or lines[0].strip() != '---':
        # No frontmatter, skip
        return False

    # Find the end of frontmatter: the next line that is exactly '---' (after stripping)
    frontmatter_end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            frontmatter_end = i
            break

    if frontmatter_end is None:
        # No closing delimiter, skip
        return False

    # Split into parts
    frontmatter_lines = lines[1:frontmatter_end]  # excluding the delimiters
    content_lines = lines[frontmatter_end+1:]      # after the closing delimiter

    # Process frontmatter lines
    new_frontmatter_lines = process_frontmatter_lines(frontmatter_lines)

    # Reassemble
    new_lines = ['---'] + new_frontmatter_lines + ['---'] + content_lines
    new_content = ''.join(new_lines)

    # Write back if changed
    if new_content != ''.join(lines):
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
    import re
    main()