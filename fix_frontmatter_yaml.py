#!/usr/bin/env python3
import os
import yaml
import sys

def quoted_string_presenter(dumper, data):
    """Present a string with single quotes, escaping single quotes by doubling."""
    # Escape single quotes in the string by doubling them
    escaped = data.replace("'", "''")
    return dumper.represent_scalar('tag:yaml.org,2002:str', escaped, style="'")

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

    # Create a custom dumper that quotes strings with single quotes and escapes single quotes
    class CustomDumper(yaml.Dumper):
        pass

    CustomDumper.add_representer(str, quoted_string_presenter)

    # Dump the frontmatter with our custom dumper
    try:
        # We want to preserve the order of keys? Not necessary for YAML, but we can try.
        # Set default_flow_style=False to get block style, not inline.
        new_frontmatter = yaml.dump(data, Dumper=CustomDumper, default_flow_style=False, allow_unicode=True)
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
                changed, _ = process_file(filepath)
                if changed:
                    updated_count += 1

    print(f"\nProcessed {total_count} .mdx files, updated {updated_count}.")

if __name__ == '__main__':
    main()