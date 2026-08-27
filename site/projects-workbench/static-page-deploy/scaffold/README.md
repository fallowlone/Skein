# Static page deploy — starter

Build a deployable static site in `artifact/` and make it pass:

    bun test

Requirements: `artifact/index.html` + `style.css` + image with explicit dimensions + `404.html`,
served correctly (no `file://`), deploy repeatable, Cache-Control correct, Lighthouse green.

`src/page.ts` is the grader — you do not edit it. The scaffold `artifact/` is intentionally thin:
no viewport meta, no explicit image dimensions, no 404 — every check fails until you fix it.
