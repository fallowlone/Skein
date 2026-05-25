#!/usr/bin/env python3
import os
import re

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

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

    return new_content != original_content, new_lines

if __name__ == '__main__':
    filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/algorithms/00-orientation/project-plan/index.mdx'
    changed, new_lines = process_file(filepath)
    if changed:
        print("Changed")
        for i, line in enumerate(new_lines):
            print(f"{i+1:3}: {repr(line)}")
    else:
        print("Not changed")