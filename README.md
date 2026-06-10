# open atlas

**A bilingual (EN/RU) curriculum for becoming a senior fullstack engineer — live at [fallowlone.com](https://fallowlone.com).**

33 tracks across mathematics, computer science, and fullstack engineering: from
counting and propositional logic up to distributed systems, system design cases,
and production observability. Every lesson is a node in one connected atlas —
with prerequisites, practice tasks, spaced repetition, and a personalized
learning path.

## What's inside

- **Tracks** — math, logic, algorithms, base CS, networking, frontend, backend,
  databases, SQL/Postgres, TypeScript, JS engine, React, Next.js, Node, NestJS,
  Go, Python, AWS, CI/CD, distributed systems, security, observability,
  system design (+ cases), and more. Each track is units of lessons authored to
  a middle+/senior depth bar: mechanism, tradeoff, failure mode, real numbers.
- **Practice** — every lesson ships graded tasks (predict / diagnose / fix /
  design / incident / review / debug / sandbox) with an in-browser runner.
- **Learning path** (`/roadmap`) — a concept-graph engine (~4800 concepts) that
  answers "what should I learn next", with deadline scheduling and calibration.
- **Spaced repetition** (`/review`) — cards harvested from lessons you visit.
- **English for Engineers** (`/english`) — vocabulary, reading, grammar, and
  speaking practice aimed at B2.
- **Projects & capstones** — non-template builds that exercise the curriculum.

## Stack

Astro 5 (static, ~4900 pages) + Preact islands + Tailwind, deployed to
Cloudflare Pages. Server side: Cloudflare Pages Functions + D1 + KV (GitHub
sign-in, progress sync, anonymous usage metrics, reader questions). Build runs
a custom curriculum linter (text budgets, lesson skeletons, i18n parity,
hydration caps) — content that violates the pedagogy rules fails the build.

## Develop

```bash
cd site
bun install
bun run build   # astro build + curriculum lint (expects 0 errors / 0 warnings)
bun run test    # unit tests
cd ../functions && bun run test   # API tests
```

Deploy is automated via GitHub Actions (`.github/workflows/deploy.yml`):
tests → runnable-sample verification → build → Cloudflare Pages.

## License

- **Code** — [MIT](./LICENSE)
- **Content** (lessons, practice, curriculum data) —
  [CC BY-SA 4.0](./LICENSE-CONTENT.md)
