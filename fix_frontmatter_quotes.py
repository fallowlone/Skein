#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If it's a key: value where value is a quoted string, we process it.
    Otherwise, return the line unchanged.
    Preserves the line ending (newline) and whitespace exactly.
    """
    # Check for newline at the end
    if line.endswith('\n'):
        has_newline = True
        line_to_process = line[:-1]
    else:
        has_newline = False
        line_to_process = line

    # If there's no colon, return the line as is
    if ':' not in line_to_process:
        if has_newline:
            return line_to_process + '\n'
        else:
            return line_to_process

    # Split by the first colon
    before_colon, after_colon = line_to_process.split(':', 1)

    # Check if after_colon contains a quoted string (ignoring leading/trailing whitespace)
    stripped_after = after_colon.strip()
    if not stripped_after:
        # No value, return line as is
        if has_newline:
            return line_to_process + '\n'
        else:
            return line_to_process

    # Check if stripped_after is a quoted string (starts and ends with same quote, either ' or ")
    if len(stripped_after) >= 2 and stripped_after[0] == stripped_after[-1] and stripped_after[0] in "\"'":
        quote_char = stripped_after[0]
        content = stripped_after[1:-1]
        # Escape single quotes in the content
        escaped_content = escape_single_quotes_in_string(content)
        # We will output as a single-quoted string
        new_value = f"'{escaped_content}'"
        # Now we need to put back the whitespace: leading and trailing whitespace from after_colon
        # Match: leading whitespace, the stripped part, trailing whitespace
        match_ws = re.match(r'(\s*)(.*)(\s*)$', after_colon)
        if match_ws:
            leading_ws, stripped, trailing_ws = match_ws.groups()
            # Replace the stripped part with our new value
            new_after_colon = leading_ws + new_value + trailing_ws
        else:
            # Fallback (should not happen)
            new_after_colon = new_value
        # Reconstruct the line without the newline
        new_line_without_newline = before_colon + ':' + new_after_colon
    else:
        # Not a quoted string we can process, return the line as is
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