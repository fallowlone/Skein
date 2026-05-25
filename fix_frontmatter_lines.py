#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If the line looks like a key: value where value is a quoted string,
    we escape single quotes in the string and ensure the value is single-quoted.
    Otherwise, return the line unchanged.
    """
    # Match: ^(\s*)(.+?)\s*:\s*(.*)$
    match = re.match(r'^(\s*)(.+?)\s*:\s*(.*)$', line)
    if not match:
        return line

    leading, key, value_part = match.groups()

    # Strip the value_part to check if it's a quoted string
    stripped = value_part.strip()
    if len(stripped) >= 2 and stripped[0] == stripped[-1] and stripped[0] in "\"'":
        quote_char = stripped[0]
        inner = stripped[1:-1]
        # Escape single quotes in the inner string
        escaped_inner = escape_single_quotes_in_string(inner)
        # We will output as a single-quoted string
        new_value_part = f"'{escaped_inner}'"
        # However, if the original was double-quoted and we changed to single-quoted,
        # we must ensure that the new_value_part does not contain unescaped single quotes.
        # We have escaped single quotes by doubling, so it's safe.
        # Reconstruct the line with the same leading whitespace, key, colon, space, and new value part
        # But note: we want to preserve the original trailing whitespace (if any) after the value?
        # The value_part may have trailing whitespace. We'll keep it by appending the same trailing whitespace.
        # However, we stripped the value_part, so we lost the trailing whitespace.
        # Let's instead: we have the original value_part, we want to replace the stripped part with new_value_part.
        # We can do: replace the stripped part in value_part with new_value_part.
        if value_part == stripped:
            # No surrounding whitespace
            new_value_part_final = new_value_part
        else:
            # Find the index of the stripped part in value_part
            start_idx = value_part.index(stripped)
            end_idx = start_idx + len(stripped)
            new_value_part_final = value_part[:start_idx] + new_value_part + value_part[end_idx:]
        return f"{leading}{key}: {new_value_part_final}"
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