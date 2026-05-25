#!/usr/bin/env python3
import os
import re
import sys
from pathlib import Path

def fix_lang_attribute(content):
    """
    Fix lang attribute that is missing closing quote.
    Examples:
        lang="en -> lang="en"
        lang="ru -> lang="ru"
    We'll use a regex to find lang="en or lang="ru that is not followed by a quote.
    """
    # Pattern to match lang="en or lang="ru that is not immediately followed by a quote
    # We want to add a quote after the language code if it's missing.
    # We'll use lookahead to ensure we don't double quote.
    def replace_match(match):
        # match group 0 is the entire match, e.g., lang="en
        # We want to add a double quote at the end if it's not already there.
        if match.group(0).endswith('"'):
            return match.group(0)
        else:
            return match.group(0) + '"'

    # This regex matches lang="en or lang="ru, but only if the next character is not a quote.
    # We use a lookahead to ensure that after the language code, there is no quote.
    pattern = r'(lang=")(en|ru)(?!["])'
    # We replace the matched pattern (without the trailing quote) with the same plus a quote.
    # However, note that the pattern does not include the trailing quote we are checking.
    # We'll do a two-step: first, find the pattern and then add a quote if the next character is not a quote.
    # Alternatively, we can use a function in the replacement.
    # We'll use: re.sub(pattern, lambda m: m.group(0) + '"', content)
    # But note: the pattern already matched the opening quote and the language code, so we add a quote.
    # However, we must be cautious: the pattern might match in the middle of a string? We assume it's in a tag.
    return re.sub(pattern, lambda m: m.group(0) + '"', content)

def process_file(filepath):
    """
    Process a single .mdx file.
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = fix_lang_attribute(content)

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