#!/usr/bin/env python3
import os
import re
import sys

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_frontmatter_line(line):
    """Process a single line of frontmatter.
    If it's a double-quoted string (or malformed with extra double quotes), we convert to single-quoted and escape single quotes.
    If it's a single-quoted string, we escape single quotes.
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

    # We'll try to process as a double-quoted string first.
    # Find the first colon
    colon_idx = line_to_process.find(':')
    if colon_idx == -1:
        # No colon, return the line as is
        if has_newline:
            return line_to_process + '\n'
        else:
            return line_to_process

    # Look for the first double quote after the colon
    first_dq_idx = line_to_process.find('"', colon_idx)
    if first_dq_idx != -1:
        # We found a double quote after the colon, now find the last double quote in the line
        last_dq_idx = line_to_process.rfind('"')
        if last_dq_idx != first_dq_idx:
            # We have at least two double quotes: process as double-quoted string
            part1 = line_to_process[:first_dq_idx]
            part2 = line_to_process[first_dq_idx:last_dq_idx+1]
            part3 = line_to_process[last_dq_idx+1:]
            inner = part2[1:-1]  # Remove the outer double quotes
            escaped_inner = escape_single_quotes_in_string(inner)
            new_part2 = "'" + escaped_inner + "'"
            new_line = part1 + new_part2 + part3
            if has_newline:
                return new_line + '\n'
            else:
                return new_line

    # If we didn't process as double-quoted, try as single-quoted string
    # Look for the first single quote after the colon
    first_sq_idx = line_to_process.find("'", colon_idx)
    if first_sq_idx != -1:
        # We found a single quote after the colon, now find the last single quote in the line
        last_sq_idx = line_to_process.rfind("'")
        if last_sq_idx != first_sq_idx:
            # We have at least two single quotes: process as single-quoted string
            part1 = line_to_process[:first_sq_idx]
            part2 = line_to_process[first_sq_idx:last_sq_idx+1]
            part3 = line_to_process[last_sq_idx+1:]
            inner = part2[1:-1]  # Remove the outer single quotes
            escaped_inner = escape_single_quotes_in_string(inner)
            new_part2 = "'" + escaped_inner + "'"
            new_line = part1 + new_part2 + part3
            if has_newline:
                return new_line + '\n'
            else:
                return new_line

    # If we didn't find any quotes to process, return the line as is
    if has_newline:
        return line_to_process + '\n'
    else:
        return line_to_process

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