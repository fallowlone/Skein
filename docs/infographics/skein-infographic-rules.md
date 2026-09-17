# Skein Infographic Generation Rules

## Purpose

These rules define the standard process for creating educational infographics for the Skein learning platform.

The goal:

Create professional technical educational illustrations similar to Apple Documentation, Stripe Engineering, Kubernetes Documentation and high-quality developer textbooks.

Every infographic must:

- explain one clear learning concept;
- improve understanding without requiring long text;
- show correct relationships between components;
- follow a consistent visual language.

---

# 1. Core Principle

Structure first, style second.

Never start with:

"Create a beautiful infographic about X"

Before generation define:

1. Learning objective.
2. Target audience.
3. Main idea.
4. Information hierarchy.
5. Visual structure.
6. Style.

---

# 2. AI Role

Use this role:

"You are a professional technical illustrator, educational UX designer, and information visualization expert creating developer documentation."

Responsibilities:

- simplify complex concepts;
- preserve technical accuracy;
- create clear visual hierarchy;
- design diagrams suitable for learning.

---

# 3. Audience Levels

Every infographic must define the audience.

## Beginner

Rules:

- use simple explanations;
- use visual metaphors;
- avoid unnecessary terminology.

## Intermediate Developer

Rules:

- use correct technical terms;
- show architecture;
- show component relationships.

## Advanced / Senior

Rules:

- show internal mechanisms;
- show trade-offs;
- show production considerations.

---

# 4. One Image = One Learning Goal

Do not combine unrelated concepts.

Bad:

"Complete Kubernetes architecture"

Too many concepts:

- Pods;
- Nodes;
- Services;
- Networking;
- Storage;
- Scheduling.

Good:

Separate images:

1. What is Kubernetes?
2. Pod architecture.
3. Deployment lifecycle.
4. Service discovery.

---

# 5. Required Infographic Types

Choose one structure.

## Timeline

Use for:

- lifecycle;
- deployment;
- request flow;
- compilation.

Structure:

Step 1 → Step 2 → Step 3 → Step 4

---

## Comparison

Use for:

- A vs B;
- technology differences;
- trade-offs.

Structure:

Left:
Option A

Center:
Key difference

Right:
Option B

---

## Layer Diagram

Use for:

- architecture;
- systems;
- infrastructure.

Structure:

Application

↓

Services

↓

Infrastructure

↓

Hardware

---

## Flow Diagram

Use for:

- processes;
- algorithms;
- pipelines.

Structure:

Input

↓

Processing

↓

Decision

↓

Output

---

# 6. Visual Hierarchy

Every infographic must define:

## Main focus

The most important concept.

Example:

"The Kubernetes cluster"

## Secondary elements

Supporting components.

Example:

Nodes and Pods.

## Supporting details

Small explanations.

Example:

Container runtime.

---

# 7. Text Rules

AI generated text is unreliable.

Rules:

- keep labels short;
- maximum 3-7 words per block;
- avoid paragraphs;
- use keywords.

Bad:

"The Kubernetes scheduler automatically assigns pods..."

Good:

Scheduler

Assigns Pods

To Nodes

---

# 8. Skein Visual Style

Default style:

Professional technical documentation.

Keywords:

- clean vector illustration;
- minimal design;
- precise diagrams;
- educational textbook style;
- Apple documentation aesthetic;
- developer tool inspired UI.

---

# 9. Color System

Use limited colors.

Meaning:

Blue:
Information

Green:
Success / completed state

Red:
Errors

Orange:
Warnings

Purple:
AI / data

Avoid random colors.

---

# 10. Technical Accuracy

For technical topics:

Always:

- verify architecture;
- verify component relationships;
- use realistic terminology;
- avoid invented components.

Especially:

- Kubernetes;
- networking;
- databases;
- AI systems;
- cloud architecture.

---

# 11. Negative Constraints

Avoid:

- excessive text;
- random icons;
- decorative elements;
- incorrect architecture;
- overlapping objects;
- unreadable labels;
- confusing arrows;
- unnecessary gradients.

---

# 12. Skein Lesson Infographic Structure

Each lesson should contain:

## 1. Hero infographic

Answers:

- What is this?
- Why does it matter?
- Where is it used?

---

## 2. Concept diagram

Answers:

- How does it work internally?

---

## 3. Practical example

Answers:

- How is it used in real systems?

---

## 4. Summary card

Answers:

- What should the student remember?

---

# 13. Quality Checklist

Before publishing:

## Content

☐ One clear idea

☐ Technically correct

☐ Correct difficulty level

☐ No unnecessary details

## Design

☐ Clear hierarchy

☐ Main concept visible first

☐ Balanced spacing

☐ No overlaps

## AI Quality

☐ No broken objects

☐ No random text

☐ Correct icons

☐ Correct arrows

## Learning

☐ Understandable without explanation

☐ Helps memory

☐ Shows relationships

---

# 14. Generation Workflow

Topic

↓

Learning objective

↓

Information architecture

↓

Visual structure

↓

Prompt

↓

Generate

↓

Review

↓

Fix prompt

↓

Final version
