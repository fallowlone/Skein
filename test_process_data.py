#!/usr/bin/env python3
import sys
sys.path.insert(0, '/Users/artemmac/dev/awesome-everything')
from fix_frontmatter_yaml_final import process_data, escape_single_quotes_in_string

# Test data similar to what we parsed
test_data = {
    'slug': 'project-plan',
    'lang': 'en',
    'track': 'ai-llm',
    'unit': '02-tool-calls',
    'order': 102,
    'title': 'Project Planning',
    'summary': 'Project Planning for unit "Tool calls"',
    'estMin': 60,
    'status': 'ready',
    'prereqs': [],
    'concepts': [],
    'sources': []
}

print("Original data:")
for k, v in test_data.items():
    print(f"  {k}: {v!r}")

print("\nProcessing data...")
result = process_data(test_data)

print("\nProcessed data:")
for k, v in result.items():
    print(f"  {k}: {v!r}")

print(f"\nSources after processing: {result.get('sources')!r}")
print(f"Length of sources: {len(result.get('sources', []))}")
