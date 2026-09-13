# UI Migration Report

## Audit

The UI layer was audited after the production audit and architecture stabilization phases.

Current state:

- Astro pages and Preact components are the main UI surfaces.
- A shadcn/ui layer already exists at `site/src/components/ui`.
- Existing shared primitives include Button, Input, Textarea, Tabs, Dropdown Menu, Sheet, and Native Select.
- Several application areas already consume the shared primitives.

Main findings:

- UI primitives were partially standardized.
- Button and form controls had the highest reuse value and already had migration paths.
- Large parts of the product use custom semantic classes (`oa-btn`, screen styles, lesson styles) that define visual identity and should remain as composition styles around primitives.
- Some interactive behavior is implemented directly in Astro scripts and Preact islands; these need case-by-case migration because replacing them mechanically can increase hydration cost.

## Migrated components

Existing shadcn/ui adoption covers:

- Button
- Input
- Textarea
- Native Select
- Tabs
- Dropdown Menu
- Sheet

Migration follows the existing component system and keeps current visual tokens and application classes.

## Removed duplication

No broad destructive cleanup was performed. Existing styling systems are shared by lesson and application screens, so duplicate removal should happen with component-level reviews.

## Accessibility improvements

The shared primitives provide a consistent base for keyboard behavior, focus handling, and semantic attributes.

Remaining audit areas:

- custom menu implementations;
- custom dialogs/drawers;
- interactive lesson widgets with manual DOM handling.

## Performance impact

The migration keeps Astro server rendering and Preact islands unchanged.

Guidelines applied:

- preserve existing islands;
- avoid adding hydration for static UI;
- use shared primitives where they replace repeated controls.

## Remaining work

Next migration steps:

- review remaining custom dialogs and overlays;
- evaluate Select, Checkbox, Radio Group, Switch, Tooltip, Alert, Card, Table, Command, and Toast usage where product behavior requires them;
- perform responsive and accessibility verification on high traffic flows;
- prepare Auth and Payments states on top of the shared UI layer.

