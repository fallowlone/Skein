#!/usr/bin/env python3
import sys

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-test/index.mdx'
with open(filepath, 'r') as f:
    lines = f.readlines()
print("=== Current file content ===")
for i, line in enumerate(lines):
    print(f"{i+1:3}: {repr(line)}")
print("=== Frontmatter section ===")
# Extract frontmatter
if lines and lines[0].strip() == '---':
    try:
        end = lines[1:].index('---\n') + 1
    except ValueError:
        end = len(lines)
    frontmatter_lines = lines[1:end]
    for i, line in enumerate(frontmatter_lines):
        print(f"{i+1:3}: {repr(line)}")
else:
    print("No frontmatter delimiter found")