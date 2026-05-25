#!/usr/bin/env python3
import yaml
import sys

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/00-orientation/project-plan/index.mdx'
with open(filepath, 'r') as f:
    content = f.read()

# Extract frontmatter
if content.startswith('---\n'):
    parts = content.split('---\n', 2)
    if len(parts) >= 3:
        frontmatter = parts[1]
        print('Frontmatter:')
        print(repr(frontmatter))
        print('---')
        try:
            data = yaml.safe_load(frontmatter)
            print('Parsed data:')
            for k, v in data.items():
                print(f'  {k!r}: {v!r} (type {type(v).__name__})')
        except Exception as e:
            print(f'YAML error: {e}')
    else:
        print('Could not split frontmatter')
else:
    print('No frontmatter delimiter')