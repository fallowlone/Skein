# Skein Premium Infographic Engine v2

## Status and boundary

V2 is experimental, with an explicit entry point under
`scripts/premium-infographics/v2/`. The existing `generate_deployment.py` remains
v1 until editorial and visual acceptance. Neither engine publishes assets or
implements R2, entitlements, site integration, or WebP delivery.

The contract is semantic content → strict validation → constrained composition →
measured text layout → SVG → browser geometry verification → generation manifest.
Python uses only its standard library. The renderer reuses the site's locked
Playwright dependency and its matching Chromium. No cloud generation service is used.

## Visual profile

This profile applies only to Skein Premium v2, not to site components or other
illustrations. The accepted mechanism-first direction replaces v1's four-card
layout; it is not a new website identity or a generic graph editor.

- Full canvas: 1600 × 1200. Synthetic preview: 800 × 600.
- Skein branding, light neutral background, explicit header/diagram/takeaway/footer.
- Inter Tight Variable, not Inter: the existing local font package supplies Latin
  and Cyrillic WOFF2 subsets. SIL OFL 1.1 permits embedding. The unmodified license
  and copyright notice travel in each SVG's metadata; font hashes are provenance.
- Heading 48px; node headings 27–30px; explanations 24–28px; supporting labels
  20–24px. Sizes never shrink automatically to fit bad copy.
- Blue denotes information, green a successful/new state, amber a caution,
  slate a neutral relation. Explicit labels and line patterns also carry meaning.
- No decorative internal-icon chips, foreign logos, CDN fonts or raster artwork.
- Fixed diagrams need a zoomable viewer in any future integration. Half-size
  inspection is an acceptance check, not a promise of mobile reflow.

## Semantic contract

`content/deployment.json` has schema version 2 and exactly the canonical deployment
units when checked against `site/src/content/units.json`. EN/RU share IDs, edges,
roles, groups and comparison criteria. Every displayed string is localized.
Sources and editorial notes are not rendered. Source URLs are references only,
never downloadable resources or SVG links.

Each unit has one teaching objective, title, subtitle, takeaway, nodes and typed
edges. Comparison units instead supply common criteria/cells. `states`, where
present, is an illustrative three-stage percentage of **traffic to the new
version**, not a measured metric or replica count. Optional `downtime` contains
three boolean flags; a flagged interval requires zero new traffic and renders an
explicit Down/Стоп label rather than 0%. This distinguishes Recreate's outage from
blue-green's continued old-version service. The four strategies are rolling,
blue-green, canary and Recreate. Replica schedules are not encoded by these bars.
Capacity/topology constraints
are intentional: unsupported graphs fail rather than silently dropping nodes.

## Template responsibilities and migration

| Unit | V2 explanation replacing v1's independent cards |
| --- | --- |
| 00-start-here | Source/artifact/registry/rollout/traffic with feedback |
| 01-image-layers | Ordered cache dependencies, invalidation, build/runtime separation |
| 02-compose-vs-k8s | Common operational criteria: one host vs cluster reconciliation |
| 03-k8s-objects | Ownership chain distinct from Service label selection |
| 04-rollout-strategies | Common availability/capacity/control criteria and new-traffic states |
| 05-iac | Inputs/state observation, plan/review/apply and locking |
| 06-lb-levels | L4/L7 comparison under one routing/TLS question |
| 07-secrets-at-deploy | Workload identity and secret lifecycle, not image-baked credentials |
| 08-putting-it-together | Gates and compatible changes before traffic, monitoring afterward |
| 09-docker-deep | Replaceable container with explicit external boundaries |
| 10-k8s-deep | Workload contract and related configuration/traffic controls |

Flow uses a vertical spine, labeled transition corridors and optional feedback.
Layers uses an ordered stack, stage labels and dependency connectors. Comparison
uses aligned criteria, not unrelated card bullets. Relationships uses a bounded
four-node composition with ownership/selection/traffic legend. It intentionally
does not attempt a comprehensive Kubernetes architecture on one poster.

## Layout and renderer contract

Composition produces rectangles and text boxes independently of font metrics.
All possible contiguous word spans are measured in one browser batch with the
actual font, size and weight. Missing metrics, an oversized indivisible token,
or excessive line height stops generation. There is no heuristic fallback in the
CLI. Approximate metrics in unit tests exercise logic only.

The browser then checks actual SVG text bounds within declared boxes and canvas,
and disallowed overlaps. XML text is escaped; SVG primitives are owned by code,
not supplied by content. Scripts, external resources, arbitrary styles and event
handlers are not an accepted content channel. Rendering is offline.

## Preview privacy

The preview composer accepts only locale and template family. It has no argument
for the premium specification. Its visible strings are the fixed public brand
and localized preview label. Title/description are likewise public, and fonts are
shared public assets. Geometric scaffolding is synthetic; blur is not a security
boundary. New hidden SVG metadata must not introduce premium content.

## Publication and verification

All selected documents are validated, measured and rendered before publication.
A content-addressed generation contains exact file hashes and metadata. Only a
successful complete generation can replace `active.json`. Previous generations
are retained; never infer the active set by globbing every generation. A subset
release explicitly reports its units/locales and cannot claim whole-course scope.
Font, template, source-content and browser versions/hashes identify provenance;
wall-clock time is not a freshness guarantee.

Dedicated CI checks data, structural/negative/file tests and canonical browser
rendering. It neither deploys nor uploads premium SVG/PNG artifacts. The existing
production workflow is deliberately unchanged.

Structural tests and successful PNG export are not visual acceptance. Before
switching the v1 command, all 22 full images and preview families require editorial
and visual review at full and practical reduced size. If image input is unavailable,
record the blocker and leave v2 experimental. Never replace this gate with an XML
parser, screenshot dimension check, or a claim based on source code alone.
