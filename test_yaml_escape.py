#!/usr/bin/env python3
import yaml
import sys

def quoted_string_presenter(dumper, data):
    # Escape single quotes by doubling
    escaped = data.replace("'", "''")
    return dumper.represent_scalar('tag:yaml.org,2002:str', escaped, style="'")

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    parts = content.split('---', 2)
    if len(parts) < 3:
        return False, content

    # Parse the frontmatter
    try:
        data = yaml.safe_load(parts[1])
        if data is None:
            data = {}
    except yaml.YAMLError as e:
        print(f"Error parsing YAML in {filepath}: {e}")
        return False, content

    # Create a custom dumper
    class CustomDumper(yaml.Dumper):
        pass

    CustomDumper.add_representer(str, quoted_string_presenter)

    # Dump the data with our custom dumper
    try:
        new_frontmatter = yaml.dump(data, Dumper=CustomDumper, default_flow_style=False, allow_unicode=True)
    except yaml.YAMLError as e:
        print(f"Error dumping YAML in {filepath}: {e}")
        return False, content

    # Reassemble
    new_content = f"---\n{new_frontmatter}---\n{parts[2]}"

    if new_content != content:
        return True, new_content
    else:
        return False, content

if __name__ == '__main__':
    filepath = sys.argv[1]
    changed, new_content = process_file(filepath)
    if changed:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes {filepath}")