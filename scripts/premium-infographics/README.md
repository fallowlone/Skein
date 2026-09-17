# Premium infographics (authoring tooling)

Local Python tooling for the private "Deployment & Infra" premium infographic set.

## Status

The generator is the only implemented part of the premium delivery pipeline. It
writes SVG files to a gitignored directory. It does not convert to WebP, upload
to R2, gate content by entitlement, or deliver anything through the site. Those
steps are intentionally out of scope until premium delivery is designed.

## Experimental v2

V1 below remains the default; v2 must not be called production-ready until its
visual acceptance gate passes. See [engine-v2.md](../../docs/infographics/engine-v2.md)
for the semantic contract, visual profile, migration and acceptance requirements.

```bash
# Data-only validation (Python 3.10+, no browser):
python3 scripts/premium-infographics/v2/generate.py --check
python3 -m unittest discover -s scripts/premium-infographics/v2/tests -v

# Install existing locked dependencies and matching browser, if absent:
(cd site && bun install --frozen-lockfile)
(cd site && bunx --no-install playwright install chromium)

# Browser regression check (fonts, geometry rejection, SVG policy, PNG dimensions):
python3 scripts/premium-infographics/v2/tests/check_renderer.py

# Canonical local generation: actual font measurement and SVG geometry checks.
python3 scripts/premium-infographics/v2/generate.py --export-png

# Four prototype units, both languages; repeated selections are supported:
python3 scripts/premium-infographics/v2/generate.py --export-png \
  --unit 01-image-layers --unit 03-k8s-objects \
  --unit 04-rollout-strategies --unit 08-putting-it-together

# One locale/unit (manifest explicitly records a partial course):
python3 scripts/premium-infographics/v2/generate.py --unit 04-rollout-strategies --locale ru
```

Node and the site's existing Playwright / Inter Tight packages are required for
canonical generation. Missing fonts or Chromium are fatal; `--check` checks only
schema/content, not layout or final image quality. No new packages are introduced.

Edit `v2/content/deployment.json`, not Python drawing code, to revise course copy.
The CLI writes a new private generation under `.premium-infographics/deployment-v2/`.
Read `active.json` and then `generations/<generation>/<file>`; don't enumerate old
generations as if they were current. A full PNG release has 44 SVGs and 44 PNGs.
`--output` may choose another trusted private folder, but in-repository output is
restricted to `.premium-infographics/`. Symlink paths are rejected. Previous
outputs are preserved; generation requires a trusted, non-shared writable folder.

The renderer batches text measurements, embeds licensed local Latin/Cyrillic fonts,
checks actual SVG text bounds and can export PNG. Each manifest records file hashes,
selection scope and renderer/font provenance. Byte identity is checked within the
same toolchain; differing Chromium/platform/font versions are different environments.
The dedicated `premium-infographics.yml` workflow validates and renders without
publishing generated assets or touching production deployment.

## Run v1

```bash
python3 scripts/premium-infographics/generate_deployment.py
```

Requires Python 3.10+ (standard library only).

## Output

`.premium-infographics/deployment/{en,ru}/` (gitignored):

- 11 units × 2 locales, full 1600×1200 SVG per unit per locale.
- One synthetic blurred `*.preview.svg` per unit per locale; it contains no
  premium copy, only placeholder bars, a dark overlay, and a lock badge.
- Deterministic: regenerating produces byte-identical files.

Keep the full-resolution SVGs private (for example in a private object store).
Previews alone are safe to publish because they contain no premium text.

## Regenerate after edits

Edit `COURSE` in `generate_deployment.py`, then rerun the script. Panel order is
green → purple → blue → orange by design; icon kinds map to simple geometric
drawings in `icon()`.

## Checks

```bash
cd scripts/premium-infographics
python3 -m unittest test_generate_deployment.py
```

Structural tests only: unit/locale coverage against `site/src/content/units.json`,
XML validity, copy preservation, preview content leakage, determinism, text
escaping, and title fit limits. They do not replace visual review of rendered
images.
