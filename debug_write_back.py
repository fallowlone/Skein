#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, '/Users/artemmac/dev/awesome-everything')
from fix_frontmatter_yaml_final import process_file

filepath = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons/en/ai-llm/02-tool-calls/project-plan/index.mdx'
print(f"Processing {filepath}")
changed, new_content = process_file(filepath)
print(f"Changed: {changed}")

if changed:
    print("Writing back to file...")
    with open(filepath, 'w') as f:
        f.write(new_content)
    print("File written.")
else:
    print("File not changed according to process_file.")

# Now let's read it back and check
print("\nReading back from file:")
with open(filepath, 'r') as f:
    content = f.read()
    
# Extract frontmatter
if content.startswith('---\n'):
    parts = content.split('---\n', 2)
    if len(parts) >= 3:
        frontmatter = parts[1]
        print("Frontmatter:")
        print(frontmatter)
    else:
        print("Could not split frontmatter properly")
else:
    print("No frontmatter delimiter found")
