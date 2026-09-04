#!/usr/bin/env bun
// sync:projects-repo — generate the standalone learner repo from this one.
//
// Source of truth stays here: projects-workbench/<slug>/{scaffold,solution}/ plus the
// project JSON in src/content/projects/<slug>.json. The generated repo ships the
// SCAFFOLD ONLY — solution/ and the JSON's `reference` notes are the answers and are
// deliberately withheld so the learner discovers the design themselves.
//
//   bun scripts/sync-projects-repo.mjs [--out <dir>]
//
// The sync is one-way and destructive on the generated paths (projects/, tools/,
// .github/) so a deleted workbench disappears downstream; anything else in the target
// dir (notably .git/) is left untouched.
import {
  readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync,
} from "node:fs";
import { join, dirname } from "node:path";

const WB = new URL("../projects-workbench/", import.meta.url).pathname;
const META = new URL("../src/content/projects/", import.meta.url).pathname;
const SITE = "https://fallowlone.com";
const REPO = "fallowlone/skein-projects";

const outArg = process.argv.indexOf("--out");
const OUT = outArg !== -1
  ? (process.argv[outArg + 1].startsWith("/")
      ? process.argv[outArg + 1]
      : join(process.cwd(), process.argv[outArg + 1]))
  : new URL("../../../skein-projects/", import.meta.url).pathname;

const write = (rel, body) => {
  const p = join(OUT, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, body);
};

// --- helpers -----------------------------------------------------------------
const tx = (v, lang) => (v && typeof v === "object" ? (v[lang] ?? v.en ?? "") : (v ?? ""));

const TEST_CMD = {
  "bun-ts": "bun test",
  python: 'python3 -m unittest discover -p "test_*.py"',
  go: "go test ./...",
};

function briefFor(slug, meta, lang) {
  const L = lang === "ru";
  const h = (en, ru) => (L ? ru : en);
  const out = [];
  out.push(`# ${tx(meta.title, lang)}`);
  out.push("");
  out.push(tx(meta.pitch, lang));
  out.push("");
  const facts = [
    `**${h("Difficulty", "Сложность")}:** ${meta.difficulty ?? "—"}`,
    `**${h("Est. days", "Оценка, дней")}:** ${meta.estDays ?? "—"}`,
    `**${h("Stack", "Стек")}:** ${(meta.stack ?? []).join(", ") || "—"}`,
    `**${h("Tracks", "Треки")}:** ${(meta.tracks ?? []).join(", ") || "—"}`,
  ];
  out.push(facts.join(" · "));
  out.push("");
  if (meta.deliverable) {
    out.push(`## ${h("Deliverable", "Что сдаём")}`, "", tx(meta.deliverable, lang), "");
  }
  if (meta.brief) {
    out.push(`## ${h("Why this project", "Зачем этот проект")}`, "", tx(meta.brief, lang), "");
  }
  if (meta.skills?.length) {
    out.push(`## ${h("Skills", "Навыки")}`, "", meta.skills.map((s) => `- ${s}`).join("\n"), "");
  }
  if (meta.milestones?.length) {
    out.push(`## ${h("Milestones", "Этапы")}`, "");
    meta.milestones.forEach((m, i) => {
      out.push(`### ${i + 1}. ${tx(m.title, lang)}`, "", tx(m.goal, lang), "");
      if (m.definitionOfDone?.length) {
        out.push(`**${h("Definition of done", "Критерии готовности")}:**`, "");
        out.push(m.definitionOfDone.map((d) => `- ${tx(d, lang)}`).join("\n"), "");
      }
      if (m.reviewPrompt) {
        out.push(`**${h("Self-review", "Самопроверка")}:** ${tx(m.reviewPrompt, lang)}`, "");
      }
    });
  }
  if (meta.rubric?.length) {
    out.push(`## ${h("Rubric", "Рубрика")}`, "");
    for (const r of meta.rubric) {
      out.push(`### ${tx(r.dimension, lang)}`, "");
      for (const [k, label] of [["junior", h("Junior", "Джуниор")], ["mid", h("Mid", "Мидл")], ["senior", h("Senior", "Синьор")]]) {
        if (r[k]) out.push(`- **${label}:** ${tx(r[k], lang)}`);
      }
      out.push("");
    }
  }
  if (meta.seniorStretch?.length) {
    out.push(`## ${h("Senior stretch", "Задачи со звёздочкой")}`, "");
    out.push(meta.seniorStretch.map((s) => `- ${tx(s, lang)}`).join("\n"), "");
  }
  out.push("---", "");
  out.push(
    L
      ? `Полная версия проекта, прогресс и связанные уроки: ${SITE}/ru/projects/${slug}`
      : `Full project page, progress tracking and linked lessons: ${SITE}/en/projects/${slug}`,
  );
  return out.join("\n") + "\n";
}

// --- collect -----------------------------------------------------------------
const slugs = readdirSync(WB).filter((d) => {
  const p = join(WB, d);
  return statSync(p).isDirectory()
    && existsSync(join(p, "manifest.json"))
    && existsSync(join(p, "scaffold"));
}).sort();

if (!slugs.length) {
  console.error("sync:projects-repo: no workbenches found");
  process.exit(1);
}

// --- regenerate --------------------------------------------------------------
for (const rel of ["projects", "tools", ".github"]) rmSync(join(OUT, rel), { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index = [];
for (const slug of slugs) {
  const base = join(WB, slug);
  const wbManifest = JSON.parse(readFileSync(join(base, "manifest.json"), "utf8"));
  const stack = wbManifest.stack ?? "bun-ts";
  if (!TEST_CMD[stack]) {
    console.error(`sync:projects-repo: ${slug} has unsupported stack "${stack}"`);
    process.exit(1);
  }
  const metaPath = join(META, `${slug}.json`);
  if (!existsSync(metaPath)) {
    console.error(`sync:projects-repo: ${slug} has a workbench but no src/content/projects/${slug}.json`);
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));

  cpSync(join(base, "scaffold"), join(OUT, "projects", slug), { recursive: true });

  const entry = {
    slug,
    stack,
    test: wbManifest.test ?? TEST_CMD[stack],
    title: meta.title,
    difficulty: meta.difficulty ?? null,
    tracks: meta.tracks ?? [],
    estDays: meta.estDays ?? null,
    url: `${SITE}/en/projects/${slug}`,
  };
  write(`projects/${slug}/manifest.json`, JSON.stringify(entry, null, 2) + "\n");
  write(`projects/${slug}/BRIEF.md`, briefFor(slug, meta, "en"));
  write(`projects/${slug}/BRIEF.ru.md`, briefFor(slug, meta, "ru"));
  index.push(entry);
}

write("projects/index.json", JSON.stringify(index, null, 2) + "\n");

// --- static repo files -------------------------------------------------------
// The grader and the workflow live as real files under scripts/projects-repo-template/
// so they stay lintable and diffable here rather than as strings in this generator.
cpSync(new URL("./projects-repo-template/", import.meta.url).pathname, OUT, { recursive: true });

for (const [src, dst] of [["LICENSE", "LICENSE"], ["LICENSE-CONTENT.md", "LICENSE-CONTENT.md"]]) {
  const p = new URL(`../../${src}`, import.meta.url).pathname;
  if (existsSync(p)) cpSync(p, join(OUT, dst));
}

write(".gitignore", ["node_modules/", "__pycache__/", "*.pyc", ".DS_Store", "dist/", ".idea/", ".vscode/"].join("\n") + "\n");

write("package.json", JSON.stringify({
  name: "skein-projects",
  private: true,
  type: "module",
  scripts: {
    grade: "bun tools/grade.mjs",
    "grade:all": "bun tools/grade.mjs --all",
  },
  devDependencies: { "@types/bun": "latest" },
}, null, 2) + "\n");

const table = index.map((p) =>
  `| [${tx(p.title, "en")}](projects/${p.slug}/) | \`${p.slug}\` | ${p.stack} | ${p.difficulty ?? "—"} | ${p.estDays ?? "—"} |`,
).join("\n");

write("README.md", `# skein — projects

${index.length} standalone engineering projects. Each one is a failing test suite plus a
stubbed implementation: make the suite green, then push past it using the rubric in the
project's \`BRIEF.md\`. Every project here is machine-verified upstream — a reference
solution exists and passes CI, so the tests are known to be both biting and satisfiable.

Solutions are **not** in this repo on purpose.

Companion to the course at ${SITE} — project pages there track progress and link the
lessons each project draws on.

## Grab one project

\`\`\`bash
npx degit ${REPO}/projects/lru-cache my-lru-cache
cd my-lru-cache && bun test
\`\`\`

Or clone everything:

\`\`\`bash
git clone https://github.com/${REPO}.git
\`\`\`

## Get graded automatically

1. **Fork this repo** (top-right).
2. Enable Actions in the fork (GitHub asks once, on the Actions tab).
3. Work inside \`projects/<slug>/\`, commit, push.
4. The \`grade\` workflow runs the project's test suite plus static checks for its stack
   and writes a pass/fail report into the run summary.

Nothing is sent anywhere — the workflow runs in your fork, on your account's runners.

Locally, the same grader:

\`\`\`bash
bun tools/grade.mjs lru-cache      # one project
bun tools/grade.mjs --all          # everything you have touched
\`\`\`

## Toolchains

| Stack | Needs | Test command |
|---|---|---|
| \`bun-ts\` | [bun](https://bun.sh) | \`bun test\` |
| \`python\` | python 3.11+ (stdlib only) | \`python3 -m unittest discover -p "test_*.py"\` |
| \`go\` | go 1.21+ | \`go test ./...\` |

No project has third-party runtime dependencies — stdlib and the test runner only.

## Projects

| Project | Slug | Stack | Difficulty | Est. days |
|---|---|---|---|---|
${table}

## Licence

Code — see [LICENSE](LICENSE). Briefs and rubrics — see [LICENSE-CONTENT.md](LICENSE-CONTENT.md).
`);

console.log(`sync:projects-repo wrote ${index.length} project(s) to ${OUT}`);
