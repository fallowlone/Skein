#!/usr/bin/env python3
import os
import yaml
import sys
from pathlib import Path

def process_frontmatter(frontmatter_str):
    """
    Process the frontmatter string:
    - Parse YAML
    - Escape single quotes in string values (replace ' with '')
    - For 'summary' key, truncate to 280 chars if needed and ensure it doesn't end with a quote
    - Return the processed YAML string
    """
    data = yaml.safe_load(frontmatter_str)
    if not isinstance(data, dict):
        # If frontmatter is not a dict, return as is (shouldn't happen for our files)
        return frontmatter_str

    def process_value(value):
        if isinstance(value, str):
            # Escape single quotes by doubling them
            escaped = value.replace("'", "''")
            return escaped
        elif isinstance(value, dict):
            return {k: process_value(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [process_value(item) for item in value]
        else:
            return value

    # Process all string values in the dict
    processed_data = {k: process_value(v) for k, v in data.items()}

    # Special handling for 'summary' key
    if 'summary' in processed_data and isinstance(processed_data['summary'], str):
        summary = processed_data['summary']
        if len(summary) > 280:
            summary = summary[:280]
        # Remove trailing single quotes to avoid YAML issues
        while summary.endswith("'"):
            summary = summary[:-1]
        processed_data['summary'] = summary

    # Dump back to YAML string
    return yaml.dump(processed_data, default_flow_style=False, allow_unicode=True)

def process_file(filepath):
    """
    Process a single .mdx file.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Check if the file starts with '---'
    if not content.startswith('---'):
        # No frontmatter, skip
        return False

    # Split by '---' - we expect at least 3 parts: [ '', frontmatter, rest ]
    parts = content.split('---', 2)
    if len(parts) < 3:
        # Malformed frontmatter, skip
        return False

    frontmatter_str = parts[1]
    rest = parts[2]

    try:
        new_frontmatter = process_frontmatter(frontmatter_str)
    except Exception as e:
        print(f"Error processing frontmatter in {filepath}: {e}")
        return False

    # Reassemble
    new_content = f"---\n{new_frontmatter}---\n{rest}"

    # Write back if changed
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    else:
        return False

def main():
    lessons_dir = Path('/Users/artemmac/dev/awesome-everything/site/src/content/lessons')
    if not lessons_dir.exists():
        print(f"Directory not found: {lessons_dir}")
        sys.exit(1)

    mdx_files = list(lessons_dir.rglob('*.mdx'))
    print(f"Found {len(mdx_files)} .mdx files")

    processed_count = 0
    for mdx_file in mdx_files:
        if process_file(mdx_file):
            print(f"Processed: {mdx_file}")
            processed_count += 1

    print(f"Total files processed: {processed_count}")

if __name__ == '__main__':
    main()