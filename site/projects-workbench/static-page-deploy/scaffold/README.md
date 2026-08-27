# Static page deploy — starter

Build a deployable static site in `artifact/` and make it pass:

    bun test

Requirements: `artifact/index.html` + `style.css` + image with explicit dimensions + `404.html`,
served correctly (no `file://`), deploy repeatable, Cache-Control correct, Lighthouse green.

`src/page.ts` is the grader — you do not edit it. The scaffold `artifact/` is intentionally thin:
no viewport meta, no explicit image dimensions, no 404 — every check fails until you fix it.

---

Product milestones — see the project page for the full 4-step product brief:

1. **Prepare and preview locally** (`prepare-and-preview`)
2. **Deploy to a public URL** (`deploy-to-public-url`)
3. **Cache headers and 404 polish** (`cache-and-404`)
4. **Lighthouse and CWV** (`lighthouse-and-cwv`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar.

