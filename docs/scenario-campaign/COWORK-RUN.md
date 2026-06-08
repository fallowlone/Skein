# Senior-Scenario Practice Campaign — cowork authoring brief

**Mission.** Bring `incident`, `debug`, and `review` practice tasks to full coverage across the teaching spine lessons. Today these scenario types are nearly empty (incident 56%, debug ~0%, review ~0%); diagnose/predict/design/fix/sandbox are already dense. You author **original, senior-grade, self-contained** scenario tasks and append them to lessons' practice files.

**Worklist.** `docs/audit/scenario-worklist.json` lists, per type, the exact `lessonKey`s that still need that type (incident ≈ 274, debug ≈ 427, review ≈ 761). One **batch = one track**. Regenerate it any time with `cd site && bun run audit:scenario`.

**Output.** For each target `lessonKey = <track>/<unit>/<slug>`, append ONE task of the target type to `site/src/content/practice/<lessonKey>.json` (its `tasks` array). If the file does not exist, create it as `{ "lessonKey": "<track>/<unit>/<slug>", "track": "<track>", "tasks": [ <task> ] }`. Keep `tasks` length ≤ 8. Task `id` must be unique within the file (`^[a-z0-9-]+$`).

---

## Rules (non-negotiable)

1. **Self-contained.** All material is embedded in the task JSON. NEVER tell the learner to find an external repo, project, or file. The broken code (`debug.starter`), the diff (`review.diff.code`), and the incident steps are all inline.
2. **Original.** Incidents/reviews may be *inspired by* public postmortems, RFCs, or well-known failure modes, but the wording must be your own. NEVER copy copyrighted text. Reconstruct the scenario in fresh words.
3. **`debug` is synchronous only.** The grader runs in QuickJS, which does NOT drain the Promise job queue — `await`/`setTimeout`/microtasks never resolve. Author logic / boundary / state bugs (off-by-one, wrong comparison, missing recency update, mutation aliasing, wrong accumulator), NOT races/timers/async.
4. **`debug` verify must stay hidden.** The hidden `verify` assertion string must NOT appear verbatim in `starter`, `prompt`, `reveal`, or `hints` (the build's `practice-debug` lint rejects a leak). The `starter` must actually FAIL its `check` — a real bug must exist (the `verify:scenario` gate executes it). House pattern: `verify` ends with `console.log(ok ? 'PASS' : 'FAIL ' + <diagnostics>)` and `check` is `{ "kind": "stdout-contains", "value": "PASS" }`.
5. **Senior bar.** Real senior pitfalls — cache stampede, LRU recency, retry amplification / no jitter, connection-pool exhaustion, N+1, idempotency gaps, consistent-hash wraparound, head-of-line blocking, lock ordering, ignoring HTTP status, unbounded growth. NOT toy exercises ("sum an array").
6. **Bilingual & distinct.** Every `{en, ru}` field needs a genuine RU translation that differs from EN (the `practice-parity` lint rejects `en === ru` on prose ≥ 25 chars). Keep technical terms in their usual form; translate the prose.
7. **Topical fit, no redundancy.** The task must teach something the lesson is about AND that its existing tasks don't already cover. Read the lesson's existing practice tasks first.
8. **Numbers must be self-consistent (incidents).** Recompute every numeric claim AND cross-check it against the task's other steps — a value stated one way in step 3 and differently in step 5 is a defect. Watch unit errors (MB vs KB, /sec vs /day, bits vs bytes) and never mislabel a multiplier (a 10× confusion is not "300×"). The calibration caught a "64 MB" that should have been 6.4 MB.
9. **Name the failure mechanism correctly for the runtime.** Don't claim a thread-level data race in single-threaded JS/Node — say "global, not per-request state" or "async interleaving" instead. Distinguish serialized vs deserialized size vs total RSS. The defect can be real while the stated physics is wrong; both must be right.

---

## The three canonical exemplars (copy this shape exactly)

### A. `debug` — sync bug, QuickJS-graded

```json
{
  "id": "lru-recency-eviction",
  "type": "debug",
  "difficulty": "stretch",
  "estMin": 12,
  "title": { "en": "The LRU cache evicts the wrong key", "ru": "LRU-кэш вытесняет не тот ключ" },
  "prompt": { "en": "This fixed-capacity client cache is meant to be LRU, but it evicts an entry that was just read… Fix `get`/`set` so the least-recently-*used* key is evicted — a `get` must count as a use.", "ru": "Этот клиентский кэш фиксированной ёмкости задуман как LRU, но вытесняет только что прочитанную запись… Почини `get`/`set`, чтобы вытеснялся реально наименее недавно использованный ключ — `get` обязан считаться использованием." },
  "evidence": { "en": "cap=2; set(a,1); set(b,2); get(a)->1; set(c,3) evicts 'a' (just read!) instead of 'b'.", "ru": "cap=2; set(a,1); set(b,2); get(a)->1; set(c,3) вытесняет 'a' (только что прочитан!) вместо 'b'." },
  "starter": "class LRU {\n  constructor(cap){ this.cap=cap; this.map=new Map(); }\n  get(key){ if(!this.map.has(key)) return undefined; return this.map.get(key); }\n  set(key,val){ this.map.set(key,val); if(this.map.size>this.cap){ const o=this.map.keys().next().value; this.map.delete(o);} }\n}",
  "verify": "const c=new LRU(2); c.set('a',1); c.set('b',2); c.get('a'); c.set('c',3);\nconst ok = c.get('a')===1 && c.get('b')===undefined && c.get('c')===3;\nconsole.log(ok ? 'PASS' : 'FAIL a='+c.get('a')+' b='+c.get('b')+' c='+c.get('c'));",
  "check": { "kind": "stdout-contains", "value": "PASS" },
  "hints": [
    { "en": "A Map keeps insertion order. 'Used' must move a key to the most-recent end — on get AND set.", "ru": "Map хранит порядок вставки. «Использование» должно двигать ключ в самый свежий конец — и на get, и на set." },
    { "en": "Bump recency: delete the key, then set it again — it re-inserts at the end.", "ru": "Обнови свежесть: удали ключ, затем снова set — он встанет в конец." }
  ],
  "reveal": { "en": "`get` must refresh recency: read, delete, re-insert so the key moves to the most-recent end. `set` does the same for an existing key, then evicts the first key (the true LRU). The bug treats insertion order as usage order, so a read never protects a key.", "ru": "`get` обязан обновлять свежесть: прочитай, удали, снова вставь — ключ уйдёт в самый свежий конец. `set` делает то же для существующего ключа, затем вытесняет первый ключ (истинный LRU). Баг путает порядок вставки с порядком использования." }
}
```

The full, validated version lives at `site/src/content/practice/frontend/02-data-fetching/04-client-cache-swr.json` (task `lru-recency-eviction`) — read it for the exact field lengths and the proven verify/check.

### B. `incident` — 3–6 guided steps, each `{label, prompt, reveal}`

Landed & validated at `site/src/content/practice/caching/03-stampede/04-stale-while-revalidate.json` (task `cache-stampede-db-overload`). Shape: a real on-call incident (symptom → mechanism → mitigation → durable fix → postmortem action). Each step: the learner commits to an answer, then reveals. 5 steps, `difficulty: "stretch"`, `estMin: 15`.

### C. `review` — read a diff, name the planted findings

```json
{
  "id": "retry-helper-review",
  "type": "review",
  "difficulty": "stretch",
  "estMin": 10,
  "title": { "en": "Review a retry-with-backoff helper", "ru": "Отревьюй helper повторов с backoff" },
  "prompt": { "en": "This `fetchJSON` helper is about to be shared across the data layer. Review it as a senior would: name the real defects (and don't flag the non-issues).", "ru": "Этот helper `fetchJSON` вот-вот станет общим для всего слоя данных. Отревьюй его как senior: назови реальные дефекты (и не цепляйся к не-проблемам)." },
  "diff": {
    "lang": "js",
    "code": "// shared across the data layer\nasync function fetchJSON(url, opts = {}) {\n  for (let attempt = 0; attempt < 3; attempt++) {\n    try {\n      const res = await fetch(url, opts);\n      return await res.json();\n    } catch (err) {\n      await sleep(2 ** attempt * 100);\n    }\n  }\n}"
  },
  "findings": [
    { "id": "ignores-http-status", "severity": "bug", "planted": true, "label": { "en": "A 4xx/5xx is treated as success", "ru": "4xx/5xx считается успехом" }, "explanation": { "en": "`fetch` only rejects on a network error, never on an HTTP error status. A 500 with a JSON error body is parsed and returned as if it succeeded — and is never retried. Check `res.ok` and throw/retry on a bad status.", "ru": "`fetch` отклоняется только на сетевой ошибке, не на HTTP-статусе. 500 с JSON-телом ошибки парсится и возвращается как успех — и никогда не повторяется. Проверяй `res.ok` и бросай/повторяй на плохом статусе." } },
    { "id": "no-jitter", "severity": "bug", "planted": true, "label": { "en": "Deterministic backoff — synchronized retries", "ru": "Детерминированный backoff — синхронные повторы" }, "explanation": { "en": "`2 ** attempt * 100` has no jitter. During an outage many clients fail together and then retry at the exact same instants, hammering the recovering server in lockstep. Add randomized jitter to the delay.", "ru": "У `2 ** attempt * 100` нет джиттера. Во время сбоя многие клиенты падают вместе и повторяют в одни и те же моменты, долбя восстанавливающийся сервер в унисон. Добавь случайный джиттер к задержке." } },
    { "id": "silent-give-up", "severity": "bug", "planted": true, "label": { "en": "Returns undefined after giving up", "ru": "Возвращает undefined, сдавшись" }, "explanation": { "en": "After 3 failed attempts the loop falls through and returns `undefined`. The caller can't tell 'the API returned no body' from 'we gave up after 3 errors'. Throw the last error on exhaustion.", "ru": "После 3 неудачных попыток цикл проваливается и возвращает `undefined`. Вызывающий не отличит «API вернул пустое тело» от «мы сдались после 3 ошибок». Бросай последнюю ошибку при исчерпании попыток." } },
    { "id": "no-exhaustion-test", "severity": "missing-test", "planted": true, "label": { "en": "No test for the all-retries-failed path", "ru": "Нет теста на путь «все повторы провалились»" }, "explanation": { "en": "The most important branch of a retry helper — what happens when every attempt fails — has no test. That path is where retry helpers usually go wrong.", "ru": "Самая важная ветка helper'а повторов — что происходит, когда все попытки провалились — не покрыта тестом. Именно там helper'ы повторов обычно и ломаются." } }
  ],
  "decoys": [
    { "id": "magic-3", "label": { "en": "The max attempt count 3 is a magic number", "ru": "Число попыток 3 — магическое число" }, "explanation": { "en": "Not a defect. 3 is a reasonable default; extracting it to config is optional polish, not a bug to block on.", "ru": "Не дефект. 3 — разумный дефолт; вынос в конфиг — опциональная полировка, не баг." } },
    { "id": "prefer-while", "label": { "en": "Use a while loop instead of for", "ru": "Использовать while вместо for" }, "explanation": { "en": "Equivalent and purely stylistic — not an issue.", "ru": "Эквивалентно и чисто стилистически — не проблема." } }
  ]
}
```

---

## Per-batch gate (the controller runs this after each track batch)

```bash
cd site
bun run verify:scenario        # every new debug starter must FAIL its check (a real bug)
bun run build:incremental      # Zod schema + practice lint (parity / lessonkey / review-findings / debug-no-leak) + renders only the changed lessons
bun run audit:scenario         # regenerate coverage + worklist; confirm the candidate count fell
```
A batch is accepted only when `verify:scenario` is OK, the build lint is `0 errors`, and a spot-review of a ≥20% sample confirms senior depth + originality + RU quality. Then commit: `git add site/src/content/practice && git commit -m "content(scenario): <type> tasks — <track> batch"`.

## Done-check

`cd site && bun run audit:scenario --gate` exits 0 when no candidate remains for any type.
