#!/usr/bin/env python3
"""Fill all project stub files with proper MDX syntax."""

import os
import re

base = '/Users/artemmac/dev/awesome-everything/site/src/content/lessons'

def fix_project_file(path, component_type):
    """Add ProjectBuild/ProjectPlan/ProjectTest component to stub file."""
    with open(path, 'r') as file:
        content = file.read()

    if '</Recap>' not in content:
        print(f"ERROR: No </Recap> in {path}")
        return False

    # Extract unit info from path
    parts = path.split('/')
    lang_idx = parts.index('lessons') + 1
    lang = parts[lang_idx]
    track = parts[lang_idx + 1]
    unit = parts[lang_idx + 2]
    unit_slug = f"{track}-{unit}"

    # Get title from frontmatter
    title_match = re.search(r'title:\s*"?([^"\n]+)"?', content)
    unit_title = title_match.group(1).strip('"') if title_match else unit.replace('-', ' ').title()

    # Find insert position (after </Recap>)
    insert_pos = content.find('</Recap>') + len('</Recap>')

    # Build component based on type - use JS object syntax with double quotes
    if component_type == 'build':
        # Check existing imports and replace if needed
        if 'import ProjectPlan from' in content:
            content = content.replace('import ProjectPlan from', 'import ProjectBuild from')
        elif 'import ProjectTest from' in content:
            content = content.replace('import ProjectTest from', 'import ProjectBuild from')

        component = f'''
<ProjectBuild
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  title="Project: {unit_title} Implementation"
  description="Build a working implementation that demonstrates understanding of {unit_title}. Your implementation should handle realistic workloads and include proper error handling and observability."
  requirements={{{'[{"Working implementation of core functionality", "Error handling for all failure modes", "Basic observability (logging, metrics)", "Test coverage for critical paths"]}'}}}
  constraints={{{'[{"Must handle at least 1000 concurrent operations", "Latency p95 < 100ms for core operations", "No blocking operations on critical path"]}'}}}
  suggestedStack={{{'[{"Language/framework of your choice", "Standard library where possible", "Proven libraries for I/O and concurrency"]}'}}}
  estimatedHours=12
/>'''
    elif component_type == 'plan':
        if 'import ProjectBuild from' in content:
            content = content.replace('import ProjectBuild from', 'import ProjectPlan from')
        elif 'import ProjectTest from' in content:
            content = content.replace('import ProjectTest from', 'import ProjectPlan from')

        component = f'''
<ProjectPlan
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  milestones={{{'[{{"name": "Requirements", "deliverable": "Functional and non-functional requirements", "timeline": "2 hours"}}, {{"name": "Design", "deliverable": "Architecture doc with tradeoffs", "timeline": "3 hours"}}, {{"name": "Implementation", "deliverable": "Working code", "timeline": "6 hours"}}, {{"name": "Testing", "deliverable": "Test suite and documentation", "timeline": "3 hours"}}]}'}}}
  resourcesNeeded={{{'[{"Development environment", "Test infrastructure", "Performance testing tools"]}'}}}
  dependencies={{{'[{"Unit prerequisites completed", "Access to test infrastructure"]}'}}}
  risks={{{'[{{"risk": "Unknown complexity", "mitigation": "Build spike to validate assumptions"}}, {{"risk": "Cutting corners on tests", "mitigation": "Define test coverage requirements upfront"}}]}'}}}
  learningCheckpoints={{{'[{"Can explain the design tradeoffs", "Can walk through the implementation", "Can demonstrate the tests"]}'}}}
/>'''
    elif component_type == 'test':
        if 'import ProjectBuild from' in content:
            content = content.replace('import ProjectBuild from', 'import ProjectTest from')
        elif 'import ProjectPlan from' in content:
            content = content.replace('import ProjectPlan from', 'import ProjectTest from')

        component = f'''
<ProjectTest
  id="{unit_slug}-project-1"
  lessonSlug="{unit_slug}"
  lang="{lang}"
  testScenarios={{{'[{"Verify core functionality with normal inputs", "Test error handling with invalid inputs", "Measure performance under load", "Check resource cleanup and memory usage"]}'}}}
  expectedOutcomes={{{'[{"All tests pass consistently", "No resource leaks", "Performance within budget"]}'}}}
  successCriteria={{{'[{"Test coverage > 80% for critical paths", "No known high-severity bugs", "Performance within budget"]}'}}}
  automatedTests={{{'[{"Unit tests for core logic", "Integration tests for boundaries", "Load tests for performance"]}'}}}
  evaluationNotes="Focus on quality of test coverage and demonstration of understanding, not just getting tests to pass."
/>'''

    new_content = content[:insert_pos] + component + content[insert_pos:]

    with open(path, 'w') as file:
        file.write(new_content)

    return True

fixed = 0

for root, dirs, files in os.walk(base):
    folder = os.path.basename(root)
    if folder not in ['project-build', 'project-plan', 'project-test']:
        continue

    for f in files:
        if f != 'index.mdx':
            continue

        path = os.path.join(root, f)

        # Read to check if already has component
        with open(path, 'r') as file:
            content = file.read()

        has_build = '<ProjectBuild' in content
        has_plan = '<ProjectPlan' in content
        has_test = '<ProjectTest' in content

        if has_build or has_plan or has_test:
            continue  # Already filled

        # Determine component type from folder
        if folder == 'project-build':
            component_type = 'build'
        elif folder == 'project-plan':
            component_type = 'plan'
        elif folder == 'project-test':
            component_type = 'test'
        else:
            continue

        if fix_project_file(path, component_type):
            fixed += 1
            print(f"Fixed: {path}")

print(f"\nTotal fixed: {fixed}")