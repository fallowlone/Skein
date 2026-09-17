# Premium infographics (authoring tooling)

Local Python tooling for the private "Deployment & Infra" premium infographic set.

## Status

The generator is the only implemented part of the premium delivery pipeline. It
writes SVG files to a gitignored directory. It does not convert to WebP, upload
to R2, gate content by entitlement, or deliver anything through the site. Those
steps are intentionally out of scope until premium delivery is designed.

## Run

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
