#!/usr/bin/env python3
import yaml
import sys

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/02-tool-calls/project-plan/index.mdx'
with open(filepath, 'r') as f:
    content = f.read()

parts = content.split('---', 2)
if len(parts) < 3:
    print('No frontmatter')
    sys.exit(1)

frontmatter_text = parts[1]
print('Frontmatter text:')
print(repr(frontmatter_text))

try:
    data = yaml.safe_load(frontmatter_text)
    print('Parsed data:')
    print(data)
    print('Type of data:', type(data))
    if isinstance(data, dict):
        for k, v in data.items():
            print(f'  {k}: {v!r} (type {type(v).__name__})')
except Exception as e:
    print(f'Error: {e}')
