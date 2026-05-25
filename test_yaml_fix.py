import yaml

def quoted_string_presenter(dumper, data):
    """Present a string with single quotes, escaping single quotes by doubling."""
    # Escape single quotes in the string by doubling them
    escaped = data.replace("'", "''")
    return dumper.represent_scalar('tag:yaml.org,2002:str', escaped, style="'")

# Test on the problematic frontmatter
frontmatter_text = '''slug: project-plan
lang: en
track: ai-llm
unit: 00-orientation
order: 102
title: "Project Planning"
summary: "Project Planning for unit "Orientation""
estMin: 60
status: ready
prereqs: []
concepts: []
sources: []'''

# Try to load
try:
    data = yaml.safe_load(frontmatter_text)
    print("Loaded data:", data)
except yaml.YAMLError as e:
    print("Error loading:", e)

# Now, let's create a custom dumper and see what we get
class CustomDumper(yaml.Dumper):
    pass

CustomDumper.add_representer(str, quoted_string_presenter)

# Dump the data
# We want to dump in block style (default_flow_style=False)
# We also want to preserve the order of keys? We'll assume the data is an OrderedDict or that PyYAML preserves order.
# We'll set indent to the default (which is 2) but we want no indentation at the top level? Actually, the frontmatter has no indentation.
# We can set the indent for the mapping to 0? Let's try with default indent and then remove the leading spaces?
# Alternatively, we can set the default indent to 0 and see what happens.
# Let's try with indent=2 and then we can adjust the entire block by removing the first two spaces if they exist?
# But note: the frontmatter might have nested structures? In our case, it's flat.
# We'll try with the default settings and see.

dumped = yaml.dump(data, Dumper=CustomDumper, default_flow_style=False)
print("\nDumped with default settings:")
print(repr(dumped))
print("\nDumped:")
print(dumped)

# Now, let's try to load the dumped string to see if it's valid
try:
    reloaded = yaml.safe_load(dumped)
    print("\nReloaded data:", reloaded)
except yaml.YAMLError as e:
    print("Error reloading:", e)