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
                print(f"    Found empty sources for key {key}, replacing with ['https://example.com']")
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
        print(f"  No proper frontmatter found in {filepath}")
        return False, content

    # parts[0] is before the first '---' (usually empty if file starts with ---)
    # parts[1] is the frontmatter (the text between the first and second '---')
    # parts[2] is everything after the second '---'
    frontmatter_text = parts[1]
    rest = parts[2]

    print(f"  Frontmatter text:\\n{frontmatter_text}")

    # Parse the frontmatter as YAML
    try:
        data = yaml.safe_load(frontmatter_text)
        if data is None:
            data = {}
        print(f"  Parsed data: {data}")
    except yaml.YAMLError as e:
        print(f"Error parsing frontmatter in {filepath}: {e}")
        return False, content

    # Process the data (escape single quotes and fix empty sources)
    processed_data = process_data(data)
    print(f"  Processed data: {processed_data}")

    # Create a custom dumper that quotes strings with single quotes
    class CustomDumper(yaml.Dumper):
        pass

    CustomDumper.add_representer(str, quoted_string_presenter)

    # Dump the frontmatter with our custom dumper
    try:
        # We want to preserve the order of keys? Not necessary for YAML, but we can try.
        # Set default_flow_style=False to get block style (not inline) for better readability.
        new_frontmatter = yaml.dump(processed_data, Dumper=CustomDumper, default_flow_style=False, allow_unicode=True)
        print(f"  New frontmatter:\\n{new_frontmatter}")
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

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 debug_ai_llm_01.py <filepath>")
        sys.exit(1)
    filepath = sys.argv[1]
    changed, new_content = process_file(filepath)
    print(f"Changed: {changed}")
    if changed:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print("File updated.")
    else:
        print("File not changed.")