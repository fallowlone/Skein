#!/usr/bin/env python3
import re

def escape_single_quotes_in_string(s):
    return s.replace("'", "''")

def process_frontmatter_line(line):
    if line.endswith('\n'):
        has_newline = True
        line_to_process = line[:-1]
    else:
        has_newline = False
        line_to_process = line

    if ':' not in line_to_process:
        if has_newline:
            return line_to_process + '\n'
        else:
            return line_to_process

    before_colon, after_colon = line_to_process.split(':', 1)
    stripped_after = after_colon.strip()
    if not stripped_after:
        if has_newline:
            return line_to_process + '\n'
        else:
            return line_to_process

    if len(stripped_after) >= 2 and stripped_after[0] == stripped_after[-1] and stripped_after[0] in "\"'":
        quote_char = stripped_after[0]
        content = stripped_after[1:-1]
        escaped_content = escape_single_quotes_in_string(content)
        new_value = f"'{escaped_content}'"
        match_ws = re.match(r'(\s*)(.*)(\s*)$', after_colon)
        if match_ws:
            leading_ws, stripped, trailing_ws = match_ws.groups()
            new_after_colon = leading_ws + new_value + trailing_ws
        else:
            new_after_colon = new_value
        new_line_without_newline = before_colon + ':' + new_after_colon
    else:
        new_line_without_newline = line_to_process

    if has_newline:
        return new_line_without_newline + '\n'
    else:
        return new_line_without_newline

# Test the sources line from the file
line = 'sources: []\n'
print('Input line:', repr(line))
result = process_frontmatter_line(line)
print('Output line:', repr(result))
print('Changed:', line != result)

# Also test what happens if there's a space after colon
line2 = 'sources: [] \n'
print('\\nInput line2:', repr(line2))
result2 = process_frontmatter_line(line2)
print('Output line2:', repr(result2))
print('Changed:', line2 != result2)