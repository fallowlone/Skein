# Fullstack on-ramp ("zero level") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing `level: zero` on-ramp lesson at the top of the Deployment & Infra track — a from-scratch entry that assumes no background and bridges into Unit 01.

**Architecture:** The data model already anticipates this: the `level` enum includes `"zero"` (used by `AltitudeGauge`, `Lesson.astro`, `connections-index`), but no lesson is authored at that level yet. We add a dedicated unit `00-start-here` (order `0`) to `units.json` containing one `lessonType: topic`, `level: zero` lesson authored EN + RU. The only infra change is relaxing the `units` collection `order` schema from `.positive()` to `.nonnegative()` so a unit can sort before order 1. Everything else (routing, track-page sort, AltitudeGauge, lint) already supports it.

**Tech Stack:** Astro 5 content collections (Zod schema in `src/content.config.ts`), MDX lessons under `src/content/lessons/{en,ru}/`, `units.json` data file, build-time linter (`bun run build`), Vitest for the schema unit test.

**Refinements over the spec** (`docs/superpowers/specs/2026-05-30-fullstack-onramp-zero-level-design.md`):
- The "zero level" mechanism is the existing `level: "zero"` enum value, not a new concept. The on-ramp lesson sets `level: zero`.
- Topic lessons do **not** require a `PracticeSet` (`checkTopicLesson` requires only: sections in order, ≥1 visual, ≥2 exercise widgets, exactly 1 `RetrievalDrawer`, ≤5 islands). The spec's "practice set ≥4" requirement does not apply; exercise widgets satisfy the bar instead.
- A separate Unit 0 needs `order: 0`, which the current `.positive()` schema rejects — hence Task 1.

---

## File structure

- `site/src/content.config.ts` — **modify** the `units` schema (`order` → nonnegative). One responsibility: collection schemas.
- `site/src/content/config.test.ts` — **modify**: add a test asserting a unit with `order: 0` validates.
- `site/src/content/units.json` — **modify**: prepend the `00-start-here` deployment unit object.
- `site/src/content/lessons/en/deployment/00-start-here/01-overview/index.mdx` — **create**: the EN on-ramp lesson.
- `site/src/content/lessons/ru/deployment/00-start-here/01-overview/index.mdx` — **create**: the RU mirror.
- `site/src/i18n/glossary.json` — **modify** (optional polish, Task 6): add `orchestrator`, `rollout`, `infrastructure-as-code`, `load-balancer` alphabetically.

Reference (read before authoring, do not edit): `site/src/content/lessons/en/deployment/01-image-layers/01-overview/index.mdx` — the topic-lesson template (imports, component usage, `data-lesson-visual`).

---

## Task 1: Allow `order: 0` for units

**Files:**
- Modify: `site/src/content.config.ts:28`
- Test: `site/src/content/config.test.ts`

- [ ] **Step 1: Read the current schema line**

Confirm `site/src/content.config.ts` line 28 reads:
```ts
    order: z.number().int().positive(),
```
inside `const units = defineCollection({ ... schema: z.object({ ... }) })`.

- [ ] **Step 2: Write the failing test**

Add to `site/src/content/config.test.ts` (match the file's existing import of the schema/collections; if it imports `collections` from `../content.config`, reuse that — otherwise import the exported `collections`):

```ts
import { describe, it, expect } from "vitest";
import { collections } from "../content.config";

describe("units order schema", () => {
  it("accepts a unit ordered before 1 (order 0)", () => {
    const unitsSchema = collections.units.schema as import("astro/zod").ZodType;
    const result = unitsSchema.safeParse({
      slug: "00-start-here",
      track: "deployment",
      order: 0,
      title: { en: "Start from zero", ru: "С нуля" },
      crux: { en: "x", ru: "x" },
      lessons: ["01-overview"],
    });
    expect(result.success).toBe(true);
  });
});
```

Note: if `collections.units.schema` is a function in this Astro version, call it with `{ image: () => {} }` to get the ZodType: `(collections.units.schema as any)({ image: () => ({}) })`. Adjust to whatever `config.test.ts` already does for `tracks`/`lessons`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd site && bunx vitest run src/content/config.test.ts -t "order 0"`
Expected: FAIL — `safeParse` returns `success: false` because `.positive()` rejects 0.

- [ ] **Step 4: Relax the schema**

In `site/src/content.config.ts`, change line 28 from:
```ts
    order: z.number().int().positive(),
```
to:
```ts
    order: z.number().int().nonnegative(),
```
(Leave the `lessons` schema's own `order: ...positive()` unchanged — lesson order still starts at 1.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd site && bunx vitest run src/content/config.test.ts -t "order 0"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content.config.ts site/src/content/config.test.ts
git commit -m "feat(lessons): allow unit order 0 for zero-level on-ramp units"
```

---

## Task 2: Register the `00-start-here` deployment unit

**Files:**
- Modify: `site/src/content/units.json`

- [ ] **Step 1: Locate the deployment block**

In `site/src/content/units.json`, find the first object with `"track": "deployment"` and `"slug": "01-image-layers"`.

- [ ] **Step 2: Insert the on-ramp unit immediately before it**

Add this object directly before the `01-image-layers` deployment object (keep JSON valid — comma after the new object):

```json
{
 "id": "deployment/00-start-here",
 "slug": "00-start-here",
 "track": "deployment",
 "order": 0,
 "title": {
  "en": "Start from zero",
  "ru": "С нуля"
 },
 "crux": {
  "en": "Before the senior material: what deployment even is, and the eight words the rest of the track assumes you know.",
  "ru": "Перед senior-материалом: что вообще такое деплой и восемь слов, которые остальной трек считает уже знакомыми."
 },
 "lessons": [
  "01-overview"
 ],
 "status": "ready"
},
```

- [ ] **Step 3: Validate JSON**

Run: `cd site && bunx tsx -e "JSON.parse(require('fs').readFileSync('src/content/units.json','utf8')); console.log('ok')"`
Expected: `ok` (no parse error).
(If `tsx` is unavailable, run `node -e "JSON.parse(require('fs').readFileSync('site/src/content/units.json','utf8'));console.log('ok')"` from repo root.)

- [ ] **Step 4: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/content/units.json
git commit -m "feat(deployment): register 00-start-here zero-level unit"
```

Note: the build will warn/error about the missing lesson `00-start-here/01-overview` until Task 3 lands. That is expected; do not deploy between Task 2 and Task 3. (If running the full build here fails on the missing lesson, that is acceptable — proceed to Task 3.)

---

## Task 3: Author the EN on-ramp lesson

**Files:**
- Create: `site/src/content/lessons/en/deployment/00-start-here/01-overview/index.mdx`

- [ ] **Step 1: Create the file with this exact content**

```mdx
---
concepts:
- what-is-deployment
- container
- image
- registry
- orchestrator
- rollout
- infrastructure-as-code
- secret
- load-balancer
deepensInto: []
estMin: 10
lang: en
lessonType: topic
level: zero
order: 1
prereqs: []
slug: 01-overview
sources:
- https://12factor.net/
- https://docs.docker.com/get-started/docker-overview/
- https://kubernetes.io/docs/concepts/overview/
- https://aws.amazon.com/what-is/iac/
spiral: []
status: ready
summary: Deployment is turning the code on your laptop into something that runs reliably
  for strangers on machines you will never touch. This is the from-zero map and the
  eight words the rest of the track assumes you already know.
title: 'Start from zero: what deployment actually is'
track: deployment
unit: 00-start-here
---

import Hook from "~/components/lesson/Hook.astro";
import Explanation from "~/components/lesson/Explanation.astro";
import Recap from "~/components/lesson/Recap.astro";
import Inset from "~/components/lesson/Inset.astro";
import Crux from "~/components/prose/Crux.astro";
import KeyTakeaway from "~/components/prose/KeyTakeaway.astro";
import RetrievalDrawer from "~/components/pedagogy/RetrievalDrawer.tsx";
import Quiz from "~/components/pedagogy/Quiz.astro";
import DragOrder from "~/components/pedagogy/DragOrder.astro";

<Hook>
Your app works. You typed `npm run dev`, opened `localhost:3000`, and there it is. Now a stranger on another continent needs to open it too — at 3am, while you are asleep, on a machine you have never seen and never will. Nothing on your laptop helps them: not your installed Node version, not your environment variables, not the database running in another terminal tab. Everything the rest of this track teaches exists to close that gap — between "runs on my machine" and "runs for everyone, without me." This lesson is the map before the climb.
</Hook>

<Crux>Deployment is packaging your code so it runs the same way on a machine you do not control, then keeping it running when you are not watching.</Crux>

<Explanation>

## The one problem deployment solves

On your laptop, your program leans on a hundred invisible things: the exact language runtime you installed, libraries already downloaded, files in the right folders, secrets sitting in your shell, a database you started by hand. "It works on my machine" is true and useless — none of that context travels. Deployment is the discipline of making the program carry its own context, so it behaves identically on a bare server in a data centre as it does on your desk. Get that right and a machine can be replaced, multiplied, or moved with no surprises. Get it wrong and every server becomes a unique snowflake that only one person knows how to revive.

Everything else is detail on top of that single idea: **make the run reproducible, then make it survive.**

## The eight words the rest of the track assumes

The senior lessons that follow drop these terms without stopping to define them. Here they are, one sentence each — what it is and why it exists.

<div data-lesson-visual class="overflow-x-auto my-6">
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="bg-surface-2">
        <th class="border border-border px-3 py-2 text-left">Word</th>
        <th class="border border-border px-3 py-2 text-left">What it is</th>
        <th class="border border-border px-3 py-2 text-left">Why it exists</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Image</strong></td>
        <td class="border border-border px-3 py-2">A frozen snapshot of your app plus everything it needs to run.</td>
        <td class="border border-border px-3 py-2">So the same bytes run everywhere — no "install these 12 things first."</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Container</strong></td>
        <td class="border border-border px-3 py-2">A running copy of an image, isolated from the rest of the machine.</td>
        <td class="border border-border px-3 py-2">So many apps share one server without stepping on each other.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Registry</strong></td>
        <td class="border border-border px-3 py-2">A warehouse you push images to and servers pull them from.</td>
        <td class="border border-border px-3 py-2">So the machine that builds and the machine that runs can be different.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Orchestrator</strong></td>
        <td class="border border-border px-3 py-2">Software (e.g. Kubernetes) that runs containers across many machines.</td>
        <td class="border border-border px-3 py-2">So when one machine dies, your app keeps running on the others.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Rollout</strong></td>
        <td class="border border-border px-3 py-2">Replacing the running version with a new one, gradually.</td>
        <td class="border border-border px-3 py-2">So a bad deploy can be caught and undone before everyone sees it.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>IaC</strong> (infrastructure as code)</td>
        <td class="border border-border px-3 py-2">Your servers and networks described in files, not clicked in a console.</td>
        <td class="border border-border px-3 py-2">So the setup is reviewable, repeatable, and not locked in one person's memory.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Secret</strong></td>
        <td class="border border-border px-3 py-2">A password, token, or key the app needs but must never be public.</td>
        <td class="border border-border px-3 py-2">So credentials are injected at run time, not baked into the image or git.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Load balancer</strong></td>
        <td class="border border-border px-3 py-2">A front door that spreads incoming traffic across many copies.</td>
        <td class="border border-border px-3 py-2">So no single copy is overwhelmed and one dead copy is skipped.</td>
      </tr>
    </tbody>
  </table>
</div>

## How they fit together

Read in order, the words tell one story: you **build** your code into an **image**, **push** it to a **registry**, and an **orchestrator** **pulls** it onto servers and starts **containers** from it. A **rollout** swaps the old containers for new ones a few at a time. A **load balancer** sends each user to a healthy container. **Secrets** are handed to the containers at start-up, and the servers themselves were created from **IaC** files. That single sentence is the entire track in miniature — every later unit zooms into one of those steps.

<Inset kind="why" lang="en">
Why not just copy your files onto a server with `scp` and run them, like the old days? Because that server slowly drifts: someone SSHes in, installs a package to fix a fire, and now it is unique. Six months later nobody can recreate it. Images and IaC exist to kill drift — the machine becomes disposable because its entire definition lives in files you can rebuild from scratch in minutes.
</Inset>

## You do not need to memorise this

Two honest notes before the climb. First: nobody holds all of this at once on day one — you will meet each word again, in depth, in its own unit, and it will stick then. This page is a coat-hook to hang the details on, not a test. Second: not every project needs every word. A tiny side project might be one container on one machine with no orchestrator and no load balancer. The senior track teaches the full picture because that is what production at scale demands — but "start simple, add pieces when the pain shows up" is itself the senior instinct.

<Quiz
  id="00-start-here-quiz-1"
  lessonSlug="01-overview"
  lang="en"
  question="Why is 'it works on my machine' not enough to ship software?"
  choices={[
    { label: "Because the program leans on invisible local context — runtime, libraries, env vars, a local database — that does not travel to another machine", correct: true },
    { label: "Because your laptop is not powerful enough to serve real users", misconception: "Power is rarely the issue for a small app; a cheap server handles plenty. The problem is that the surrounding context your code depends on only exists on your laptop." },
    { label: "Because production code must be written in a different language", misconception: "The same code ships to production. What changes is that it must carry its own context (an image) so it runs identically elsewhere — not the language." },
    { label: "Because you must always use Kubernetes in production", misconception: "Plenty of production apps run with no orchestrator at all. The fundamental gap is reproducibility, which images solve; orchestrators only matter once you need many machines." },
  ]}
/>

<DragOrder
  id="00-start-here-drag-1"
  lessonSlug="01-overview"
  lang="en"
  prompt="Order the journey from your code to a user's request reaching it:"
  items={[
    { id: "a", label: "Build your code into an image (it now carries its own context)" },
    { id: "b", label: "Push the image to a registry" },
    { id: "c", label: "An orchestrator pulls the image onto servers and starts containers" },
    { id: "d", label: "A load balancer routes a user's request to a healthy container" },
  ]}
  correctOrder={["a", "b", "c", "d"]}
/>

</Explanation>

<KeyTakeaway>Deployment makes your code carry its own context so it runs the same on machines you do not control, then keeps it running when you are not watching. Image → registry → orchestrator → container → rollout → load balancer, with secrets injected at run time and servers defined as code. You will meet each word in depth later — this is just the map.</KeyTakeaway>

<RetrievalDrawer
  client:load
  id="00-start-here-retrieval"
  lang="en"
  questions={[
    { q: "In one breath, what problem does deployment solve, and what is the core technique?", a: "On your laptop a program quietly depends on context that does not travel: the exact runtime, pre-installed libraries, files in specific places, secrets in your shell, a database you started by hand. 'Works on my machine' is therefore true but useless, because none of that exists on the server that has to run it for real users. Deployment solves this by making the program carry its own context so it behaves identically on a machine you do not control. The core technique is reproducibility first — package the app and everything it needs into an image — and survival second: run that image as containers an orchestrator can replace, multiply, or move, behind a load balancer, with secrets injected at run time and the servers themselves defined as code so nothing is a hand-tuned snowflake." },
    { q: "Trace the path from your source code to a user's request reaching it, naming each piece.", a: "You build your source into an image, a frozen snapshot of the app plus its dependencies. You push that image to a registry, a warehouse other machines pull from, which decouples the machine that builds from the machine that runs. An orchestrator (such as Kubernetes) pulls the image onto one or more servers and starts containers — running, isolated copies of the image. During a deploy a rollout replaces old containers with new ones gradually, so a bad version can be caught and rolled back before it reaches everyone. A load balancer sits in front and routes each incoming user request to a healthy container, skipping dead ones and spreading load. Secrets are handed to the containers at start-up rather than baked into the image, and the servers were themselves created from infrastructure-as-code files so the whole setup is reviewable and reproducible." },
  ]}
/>

<Recap lang="en">
Deployment is one idea with a lot of machinery hung off it: make your code carry its own context so it runs the same on a machine you do not control, then keep it running while you sleep. The reproducible half is an image — a frozen snapshot of your app and its dependencies — stored in a registry so the building machine and the running machine can differ. The survival half is everything that keeps it alive at scale: an orchestrator starts and restarts containers across many servers, a rollout swaps versions gradually so mistakes are caught early, a load balancer spreads traffic across healthy copies, secrets are injected at run time instead of baked in, and the servers themselves are defined as code so none of them is an irreplaceable snowflake. You do not need to hold all eight words at once — each gets its own unit ahead. Next: Unit 01, what an image is actually made of.
</Recap>
```

- [ ] **Step 2: Verify the file parses (frontmatter + imports)**

Run: `cd site && bun run build 2>&1 | tail -30`
Expected: build completes; the deployment track and the new lesson page build. Note any lint errors in the output for Task 5; do not fix prose yet.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add "site/src/content/lessons/en/deployment/00-start-here/01-overview/index.mdx"
git commit -m "content(deployment): 00-start-here zero-level on-ramp (EN)"
```

---

## Task 4: Author the RU mirror

**Files:**
- Create: `site/src/content/lessons/ru/deployment/00-start-here/01-overview/index.mdx`

- [ ] **Step 1: Create the file with this exact content**

```mdx
---
concepts:
- what-is-deployment
- container
- image
- registry
- orchestrator
- rollout
- infrastructure-as-code
- secret
- load-balancer
deepensInto: []
estMin: 10
lang: ru
lessonType: topic
level: zero
order: 1
prereqs: []
slug: 01-overview
sources:
- https://12factor.net/
- https://docs.docker.com/get-started/docker-overview/
- https://kubernetes.io/docs/concepts/overview/
- https://aws.amazon.com/what-is/iac/
spiral: []
status: ready
summary: Деплой — это превратить код с твоего ноутбука в нечто, что надёжно работает
  для незнакомцев на машинах, которых ты никогда не коснёшься. Это карта «с нуля»
  и восемь слов, которые остальной трек считает уже знакомыми.
title: 'С нуля: что такое деплой на самом деле'
track: deployment
unit: 00-start-here
---

import Hook from "~/components/lesson/Hook.astro";
import Explanation from "~/components/lesson/Explanation.astro";
import Recap from "~/components/lesson/Recap.astro";
import Inset from "~/components/lesson/Inset.astro";
import Crux from "~/components/prose/Crux.astro";
import KeyTakeaway from "~/components/prose/KeyTakeaway.astro";
import RetrievalDrawer from "~/components/pedagogy/RetrievalDrawer.tsx";
import Quiz from "~/components/pedagogy/Quiz.astro";
import DragOrder from "~/components/pedagogy/DragOrder.astro";

<Hook>
Твоё приложение работает. Ты набрал `npm run dev`, открыл `localhost:3000` — и вот оно. Теперь незнакомцу на другом континенте тоже нужно его открыть — в три ночи, пока ты спишь, на машине, которую ты никогда не видел и не увидишь. Ничего с твоего ноутбука ему не поможет: ни установленная версия Node, ни переменные окружения, ни база данных, запущенная в соседней вкладке терминала. Всё, чему учит этот трек, существует, чтобы закрыть этот разрыв — между «работает у меня» и «работает у всех, без меня». Этот урок — карта перед восхождением.
</Hook>

<Crux>Деплой — это упаковать код так, чтобы он одинаково работал на машине, которой ты не управляешь, и удержать его работающим, когда ты не смотришь.</Crux>

<Explanation>

## Единственная проблема, которую решает деплой

На твоём ноутбуке программа опирается на сотню невидимых вещей: точную версию рантайма, уже скачанные библиотеки, файлы в нужных папках, секреты в твоём shell, базу, которую ты поднял руками. «Работает у меня» — правда и при этом бесполезно: ничего из этого контекста не путешествует вместе с кодом. Деплой — это дисциплина заставить программу нести свой контекст с собой, чтобы она вела себя одинаково на голом сервере в дата-центре и на твоём столе. Сделаешь правильно — машину можно заменить, размножить или перенести без сюрпризов. Сделаешь неправильно — каждый сервер станет уникальной снежинкой, которую умеет оживить только один человек.

Всё остальное — детали поверх одной идеи: **сделай запуск воспроизводимым, затем сделай так, чтобы он выживал.**

## Восемь слов, которые остальной трек считает знакомыми

Senior-уроки дальше используют эти термины, не останавливаясь на определениях. Вот они, по одному предложению — что это и зачем оно.

<div data-lesson-visual class="overflow-x-auto my-6">
  <table class="w-full text-sm border-collapse">
    <thead>
      <tr class="bg-surface-2">
        <th class="border border-border px-3 py-2 text-left">Слово</th>
        <th class="border border-border px-3 py-2 text-left">Что это</th>
        <th class="border border-border px-3 py-2 text-left">Зачем оно</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Image</strong> (образ)</td>
        <td class="border border-border px-3 py-2">Замороженный снимок приложения и всего, что нужно для запуска.</td>
        <td class="border border-border px-3 py-2">Чтобы те же байты работали везде — без «сначала поставь 12 штук».</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Container</strong> (контейнер)</td>
        <td class="border border-border px-3 py-2">Запущенная копия образа, изолированная от остальной машины.</td>
        <td class="border border-border px-3 py-2">Чтобы много приложений делили один сервер, не мешая друг другу.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Registry</strong> (реестр)</td>
        <td class="border border-border px-3 py-2">Склад, куда ты пушишь образы, а серверы их оттуда тянут.</td>
        <td class="border border-border px-3 py-2">Чтобы машина, которая собирает, и машина, которая запускает, были разными.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Orchestrator</strong> (оркестратор)</td>
        <td class="border border-border px-3 py-2">ПО (например, Kubernetes), запускающее контейнеры на многих машинах.</td>
        <td class="border border-border px-3 py-2">Чтобы при смерти одной машины приложение жило на остальных.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Rollout</strong> (выкатка)</td>
        <td class="border border-border px-3 py-2">Постепенная замена работающей версии на новую.</td>
        <td class="border border-border px-3 py-2">Чтобы плохой деплой поймать и откатить до того, как его увидят все.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>IaC</strong> (инфраструктура как код)</td>
        <td class="border border-border px-3 py-2">Серверы и сети, описанные в файлах, а не накликанные в консоли.</td>
        <td class="border border-border px-3 py-2">Чтобы настройку можно было ревьюить, повторять и не держать в одной голове.</td>
      </tr>
      <tr>
        <td class="border border-border px-3 py-2"><strong>Secret</strong> (секрет)</td>
        <td class="border border-border px-3 py-2">Пароль, токен или ключ, который нужен приложению, но не должен утечь.</td>
        <td class="border border-border px-3 py-2">Чтобы креды подставлялись на запуске, а не вшивались в образ или git.</td>
      </tr>
      <tr class="bg-surface-2">
        <td class="border border-border px-3 py-2"><strong>Load balancer</strong> (балансировщик)</td>
        <td class="border border-border px-3 py-2">Парадная дверь, распределяющая входящий трафик по многим копиям.</td>
        <td class="border border-border px-3 py-2">Чтобы ни одна копия не захлебнулась, а мёртвую копию обходили.</td>
      </tr>
    </tbody>
  </table>
</div>

## Как они складываются вместе

Прочитанные по порядку, слова рассказывают одну историю: ты **собираешь** код в **image**, **пушишь** его в **registry**, а **orchestrator** **тянет** его на серверы и запускает из него **контейнеры**. **Rollout** меняет старые контейнеры на новые по чуть-чуть. **Load balancer** отправляет каждого пользователя к живому контейнеру. **Секреты** выдаются контейнерам на старте, а сами серверы созданы из **IaC**-файлов. Это одно предложение — весь трек в миниатюре; каждый следующий юнит увеличивает один из шагов.

<Inset kind="why" lang="ru">
Почему просто не скопировать файлы на сервер через `scp` и не запустить, как в старые времена? Потому что такой сервер медленно дрейфует: кто-то зашёл по SSH, поставил пакет, чтобы потушить пожар, — и теперь он уникален. Через полгода никто не сможет его воссоздать. Образы и IaC существуют, чтобы убить дрейф: машина становится одноразовой, потому что всё её определение живёт в файлах, из которых её можно пересобрать с нуля за минуты.
</Inset>

## Это не нужно зубрить

Две честные ремарки перед восхождением. Первая: никто не держит всё это в голове сразу в первый день — ты встретишь каждое слово снова, в глубине, в своём юните, и тогда оно уляжется. Эта страница — вешалка, на которую вешать детали, а не экзамен. Вторая: не каждому проекту нужно каждое слово. Крошечный пет-проект может быть одним контейнером на одной машине без оркестратора и балансировщика. Senior-трек учит полной картине, потому что этого требует продакшен под нагрузкой, — но «начни просто, добавляй части, когда заболит» и есть senior-инстинкт.

<Quiz
  id="00-start-here-quiz-1"
  lessonSlug="01-overview"
  lang="ru"
  question="Почему «работает у меня» недостаточно, чтобы выпустить софт?"
  choices={[
    { label: "Потому что программа опирается на невидимый локальный контекст — рантайм, библиотеки, переменные окружения, локальную базу, — который не путешествует на другую машину", correct: true },
    { label: "Потому что твой ноутбук недостаточно мощный для реальных пользователей", misconception: "Мощность редко проблема для небольшого приложения; дешёвый сервер тянет многое. Проблема в том, что окружающий контекст, от которого зависит код, существует только на твоём ноутбуке." },
    { label: "Потому что продакшен-код нужно писать на другом языке", misconception: "В продакшен едет тот же код. Меняется то, что он должен нести свой контекст (образ), чтобы работать одинаково в другом месте, — а не язык." },
    { label: "Потому что в продакшене всегда нужен Kubernetes", misconception: "Множество продакшен-приложений работают вообще без оркестратора. Фундаментальный разрыв — это воспроизводимость, которую решают образы; оркестраторы важны только когда нужно много машин." },
  ]}
/>

<DragOrder
  id="00-start-here-drag-1"
  lessonSlug="01-overview"
  lang="ru"
  prompt="Расставь путь от твоего кода до запроса пользователя, который до него доходит:"
  items={[
    { id: "a", label: "Собрать код в image (теперь он несёт свой контекст)" },
    { id: "b", label: "Запушить image в registry" },
    { id: "c", label: "Orchestrator тянет image на серверы и запускает контейнеры" },
    { id: "d", label: "Load balancer направляет запрос пользователя к живому контейнеру" },
  ]}
  correctOrder={["a", "b", "c", "d"]}
/>

</Explanation>

<KeyTakeaway>Деплой заставляет код нести свой контекст, чтобы он одинаково работал на машинах, которыми ты не управляешь, и удерживает его работающим, когда ты не смотришь. Image → registry → orchestrator → контейнер → rollout → load balancer, с секретами на запуске и серверами как код. Каждое слово ты встретишь глубже позже — это просто карта.</KeyTakeaway>

<RetrievalDrawer
  client:load
  id="00-start-here-retrieval"
  lang="ru"
  questions={[
    { q: "В одном дыхании: какую проблему решает деплой и в чём ядро техники?", a: "На ноутбуке программа тихо зависит от контекста, который не путешествует: точный рантайм, предустановленные библиотеки, файлы в конкретных местах, секреты в shell, база, поднятая руками. Поэтому «работает у меня» — правда, но бесполезная: ничего этого нет на сервере, который должен запустить код для реальных пользователей. Деплой решает это, заставляя программу нести свой контекст, чтобы она вела себя одинаково на машине, которой ты не управляешь. Ядро техники: сначала воспроизводимость — упаковать приложение и всё, что ему нужно, в образ; затем выживание — запускать этот образ как контейнеры, которые оркестратор может заменить, размножить или перенести, за балансировщиком, с секретами на запуске и серверами, описанными как код, чтобы ничто не было ручной снежинкой." },
    { q: "Проследи путь от исходного кода до запроса пользователя, называя каждую часть.", a: "Ты собираешь исходники в image — замороженный снимок приложения и его зависимостей. Пушишь образ в registry, склад, откуда другие машины тянут его, что разделяет машину-сборщик и машину-исполнитель. Orchestrator (например, Kubernetes) тянет образ на один или несколько серверов и запускает контейнеры — работающие изолированные копии образа. Во время деплоя rollout заменяет старые контейнеры новыми постепенно, чтобы плохую версию поймать и откатить до того, как она дойдёт до всех. Load balancer стоит спереди и направляет каждый запрос к живому контейнеру, обходя мёртвые и распределяя нагрузку. Секреты выдаются контейнерам на старте, а не вшиваются в образ, и серверы созданы из infrastructure-as-code файлов, так что вся настройка ревьюится и воспроизводится." },
  ]}
/>

<Recap lang="ru">
Деплой — это одна идея с кучей навешанной механики: заставь код нести свой контекст, чтобы он работал одинаково на машине, которой ты не управляешь, и удержи его работающим, пока ты спишь. Воспроизводимая половина — это image, замороженный снимок приложения и зависимостей, хранящийся в registry, чтобы машина-сборщик и машина-исполнитель могли различаться. Половина выживания — всё, что держит его живым под нагрузкой: orchestrator запускает и перезапускает контейнеры на многих серверах, rollout меняет версии постепенно, чтобы ошибки ловились рано, load balancer распределяет трафик по живым копиям, секреты подставляются на запуске, а сами серверы описаны как код, так что ни один из них не является незаменимой снежинкой. Тебе не нужно держать все восемь слов сразу — у каждого впереди свой юнит. Дальше: Unit 01, из чего на самом деле собран image.
</Recap>
```

- [ ] **Step 2: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add "site/src/content/lessons/ru/deployment/00-start-here/01-overview/index.mdx"
git commit -m "content(deployment): 00-start-here zero-level on-ramp (RU)"
```

---

## Task 5: Build, lint, and fix any failures

**Files:**
- Possibly modify: the two lesson MDX files (only if lint reports an issue).

- [ ] **Step 1: Full build**

Run: `cd site && bun run build 2>&1 | tail -40`
Expected: build succeeds, ~303 pages (301 prior + 2 new lesson pages EN/RU).

- [ ] **Step 2: Inspect the lint report**

Run: `cd site && cat dist/lint-report.json`
Expected: no errors referencing `deployment/00-start-here`. Check specifically for:
- topic sections present/in order (hook, crux, explanation, key-takeaway, recap),
- "no visual widget" (the `data-lesson-visual` table satisfies this),
- "fewer than 2 exercise widgets" (Quiz + DragOrder = 2 — satisfies),
- "must have exactly 1 RetrievalDrawer" (one present — satisfies),
- hydration islands ≤ 5,
- i18n parity (EN and RU both present),
- sources footer has an external link.

- [ ] **Step 3: Fix only what the report flags**

If an error appears, fix it in the relevant MDX file (e.g. add a missing section, remove an extra island). Re-run Step 1–2 until `dist/lint-report.json` is clean. Do not restructure beyond what the report requires.

- [ ] **Step 4: Commit (only if fixes were made)**

```bash
cd /Users/artemmac/dev/awesome-everything
git add "site/src/content/lessons"
git commit -m "fix(deployment): satisfy linter for 00-start-here on-ramp"
```

---

## Task 6 (optional polish): Glossary terms

**Files:**
- Modify: `site/src/i18n/glossary.json`

- [ ] **Step 1: Check which terms are missing**

Run: `cd site && grep -c '"orchestrator"\|"rollout"\|"infrastructure-as-code"\|"load-balancer"' src/i18n/glossary.json`
The on-ramp does not use the `<Term>` component, so this is not required for lint — skip this task if you want the minimal change. If adding: insert each missing term **alphabetically**, following the exact shape of a neighbouring entry (locked `def`/`defRu` per locale).

- [ ] **Step 2: Rebuild to confirm parity**

Run: `cd site && bun run build 2>&1 | tail -5`
Expected: clean build, no glossary parity errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemmac/dev/awesome-everything
git add site/src/i18n/glossary.json
git commit -m "content(glossary): add deployment on-ramp terms"
```

---

## Task 7: Visual verification

- [ ] **Step 1: Preview the built site**

Run: `cd site && bunx astro preview` (or `bunx serve dist`), then open:
- `http://localhost:4321/en/learn/deployment/` — confirm "Start from zero" is the **first** card (Unit 0), above "Image layers".
- `http://localhost:4321/en/learn/deployment/00-start-here/01-overview/` — confirm: AltitudeGauge shows the lowest ("zero") band, the eight-word table renders, Quiz + DragOrder are interactive, the RetrievalDrawer opens, and the recap names "Unit 01" as next.
- `http://localhost:4321/ru/learn/deployment/00-start-here/01-overview/` — same checks in Russian.

- [ ] **Step 2: Final confirmation**

Confirm `git status` is clean and all tasks are committed. Report the new page URLs and that the linter is clean. Do not push to `main` (which auto-deploys) until the user approves the pilot.

---

## Self-review notes

- **Spec coverage:** Goal (from-zero on-ramp) → Tasks 3/4. Placement Unit 0 → Tasks 1/2. Topic skeleton + visual + ≥2 exercises + 1 RetrievalDrawer → Tasks 3/4, verified in Task 5. Bilingual/parity → Tasks 3/4/5. Verify (build/lint/visual) → Tasks 5/7. Risk "unit-level quiz/project obligation" → resolved: `block-stubs.ts` only checks existing `ready` quiz/project blocks, so a unit without them is fine (no separate task needed). Rollout → out of scope for this plan (separate effort), noted in spec.
- **Placeholder scan:** none — full MDX content and exact commands provided.
- **Type/identifier consistency:** unit slug `00-start-here`, lesson slug `01-overview`, `lessonKey = deployment/00-start-here/01-overview`, `level: zero`, `lessonType: topic`, widget ids `00-start-here-*` — consistent across Tasks 2–4 and the verification checks.
