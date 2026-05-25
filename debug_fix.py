#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/artemmac/dev/awesome-everything')
from fix_frontmatter_quotes_final import process_file

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-build/index.mdx'
changed, new_lines = process_file(filepath)
print("Changed:", changed)
if changed:
    print("Writing back to file...")
    with open(filepath, 'w') as f:
        f.writelines(new_lines)
    print("File written.")

    # Read it back to verify
    with open(filepath, 'r') as f:
        lines = f.readlines()
    print("\nFile content after write:")
    for i, line in enumerate(lines[:15]):
        print(f"{i}: {repr(line)}")
else:
    print("Not changed")