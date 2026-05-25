#!/usr/bin/env python3
filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-build/index.mdx'
with open(filepath, 'r') as f:
    lines = f.readlines()
for i, line in enumerate(lines):
    print(f"{i+1:3}: {repr(line)}")