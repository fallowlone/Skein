#!/usr/bin/env python3
import os
import sys
import yaml
import re

def escape_single_quotes_in_string(s):
    """Escape single quotes in a string by doubling them."""
    return s.replace("'", "''")

def process_data(data):
    """Recursively process data to escape single quotes in strings and fix empty sources."""
    if isinstance(data, str):
        return escape_single_quotes_in_string(data)
    elif isinstance(data, dict):
        processed = {}
        for key, value in data.items():
            # Special handling for sources array
            if key == "sources" and isinstance(value, list) and len(value) == 0:
                processed[key] = ["https://example.com"]
            else:
                processed[key] = process_data(value)
        return processed
    elif isinstance(data, list):
        return [process_data(item) for item in data]
    else:
        return data

def quoted_string_presenter(dumper, data):
    """Present a string with single quotes, escaping single quotes by doubling."""
    # The data has already been escaped (single quotes doubled) by process_data
    return dumper.represent_scalar('tag:yaml.org,2002:str', data, style="'")

def process_file(filepath):
    """Process a single .mdx file."""
    with open(filepath, 'r') as f:
        content = f.read()

    # Split by '---' to isolate frontmatter, maxsplit=2 to get three parts.
    parts = content.split('---', 2)
    if len(parts) < 3:
        # No proper frontmatter found, skip
        return False, content

    # parts[0] is before the first '---' (usually empty if file starts with ---)
    # parts[1] is the frontmatter (the text between the first and second '---')
    # parts[2] is everything after the second '---'
    frontmatter_text = parts[1]
    rest = parts[2]

    # Parse the frontmatter as YAML
    try:
        data = yaml.safe_load(frontmatter_text)
        if data is None:
            data = {}
    except yaml.YAMLError as e:
        print(f"Error parsing frontmatter in {filepath}: {e}")
        return False, content

    # Process the data (escape single quotes and fix empty sources)
    processed_data = process_data(data)

    # Create a custom dumper that quotes strings with single quotes
    class CustomDumper(yaml.Dumper):
        pass

    CustomDumper.add_representer(str, quoted_string_presenter)

    # Dump the frontmatter with our custom dumper
    try:
        # We want to preserve the order of keys? Not necessary for YAML, but we can try.
        # Set default_flow_style=False to get block style (not inline) for better readability.
        new_frontmatter = yaml.dump(processed_data, Dumper=CustomDumper, default_flow_style=False, allow_unicode=True)
    except yaml.YAMLError as e:
        print(f"Error dumping frontmatter in {filepath}: {e}")
        return False, content

    # Reassemble content
    new_content = f"---\n{new_frontmatter}---\n{rest}"

    # Write back if changed
    if new_content != content:
        return True, new_content
    else:
        return False, content

def main():
    lessons_dir = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons'
    if not os.path.isdir(lessons_dir):
        print(f"Directory not found: {lessons_dir}")
        sys.exit(1)

    updated_count = 0
    total_count = 0

    for root, dirs, files in os.walk(lessons_dir):
        for file in files:
            if file.endswith('.mdx'):
                filepath = os.path.join(root, file)
                total_count += 1
                changed, new_content = process_file(filepath)
                if changed:
                    with open(filepath, 'w') as f:
                        f.write(new_content)
                    updated_count += 1

    print(f"\nProcessed {total_count} .mdx files, updated {updated_count}.")

if __name__ == '__main__':
    main()