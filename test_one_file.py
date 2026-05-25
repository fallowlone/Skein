#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/artemmac/dev/awesome-everything')
from fix_frontmatter_final_attempt import process_file

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-plan/index.mdx'
changed, new_lines = process_file(filepath)
print("Changed:", changed)
if changed:
    print("New lines:")
    for i, line in enumerate(new_lines):
        print(f"{i}: {repr(line)}")
else:
    print("Not changed")
    with open(filepath, 'r') as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        print(f"{i}: {repr(line)}")