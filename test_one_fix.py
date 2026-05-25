#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/artemmac/dev/awesome-everything')
from fix_frontmatter_yaml_final import process_file

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/algorithms/00-orientation/quiz-choice/index.mdx'
changed, new_content = process_file(filepath)
print("Changed:", changed)
if changed:
    print("--- New content ---")
    print(new_content)
else:
    print("Not changed")
    with open(filepath, 'r') as f:
        print(f.read())