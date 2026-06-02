// One-shot scaffold for 3 new deep tracks: sql-postgres, js-engine, typescript.
// Registers tracks in tracks.json + units.json and writes EN+RU stub lessons
// (frontmatter only, status: stub). Shared TS files (types/index.ts,
// track-meta.ts) are patched manually. Idempotent: skips entries that exist.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const C = join(ROOT, "src/content");

// [slug, enTitle]  — order is index+1, RU stub title reuses EN (agent rewrites).
const SPEC = [
  {
    slug: "sql-postgres", order: 20, color: "lilac",
    title: { en: "SQL & PostgreSQL, deep", ru: "SQL и PostgreSQL вглубь" },
    blurb: {
      en: "The SQL language and Postgres internals for senior engineers — joins, windows, CTEs, transactions, the planner.",
      ru: "Язык SQL и внутренности Postgres для senior-инженеров — джоины, окна, CTE, транзакции, планировщик.",
    },
    src: "https://www.postgresql.org/docs/current/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "Before the deep material: what SQL is and how Postgres executes a query.", ru: "Перед глубоким материалом: что такое SQL и как Postgres исполняет запрос." },
        lessons: [["01-why-sql-runs-everything","Why SQL still runs everything"],["02-how-postgres-executes-a-query","How Postgres executes a query"]] },
      { slug: "01-sql-foundations", order: 1, title: { en: "SQL foundations", ru: "Основы SQL" },
        crux: { en: "The mental model: SQL describes sets, not steps.", ru: "Ментальная модель: SQL описывает множества, а не шаги." },
        lessons: [["01-select-mental-model","The SELECT mental model"],["02-filtering-rows","Filtering rows with WHERE"],["03-null-and-three-valued-logic","NULL and three-valued logic"],["04-distinct-and-set-ops","DISTINCT and set operations"],["05-sorting-and-limiting","Sorting and limiting"]] },
      { slug: "02-joins-deep", order: 2, title: { en: "Joins, deeply", ru: "Джоины вглубь" },
        crux: { en: "Every join is a filtered Cartesian product — see that and outer/semi/anti/lateral follow.", ru: "Любой join — отфильтрованное декартово произведение; увидев это, поймёшь outer/semi/anti/lateral." },
        lessons: [["01-join-as-product","A join is a filtered product"],["02-inner-vs-outer","Inner vs outer joins"],["03-semi-and-anti-joins","Semi and anti joins"],["04-self-and-cross-joins","Self and cross joins"],["05-lateral-joins","LATERAL joins"],["06-join-traps","Join traps and row explosions"]] },
      { slug: "03-aggregation", order: 3, title: { en: "Aggregation & grouping", ru: "Агрегация и группировка" },
        crux: { en: "GROUP BY collapses rows into buckets; everything in SELECT must be per-bucket.", ru: "GROUP BY схлопывает строки в корзины; всё в SELECT должно быть на корзину." },
        lessons: [["01-group-by-model","The GROUP BY model"],["02-having-vs-where","HAVING vs WHERE"],["03-aggregate-functions","Aggregate functions"],["04-grouping-sets-rollup-cube","Grouping sets, ROLLUP, CUBE"],["05-conditional-aggregation","Conditional aggregation with FILTER"]] },
      { slug: "04-window-functions", order: 4, title: { en: "Window functions", ru: "Оконные функции" },
        crux: { en: "Windows aggregate without collapsing rows — the senior SQL superpower.", ru: "Окна агрегируют, не схлопывая строки — суперсила senior-SQL." },
        lessons: [["01-windows-vs-group-by","Windows vs GROUP BY"],["02-partition-and-order","PARTITION BY and ORDER BY"],["03-window-frames","Window frames"],["04-ranking-functions","Ranking functions"],["05-running-totals","Running totals and moving averages"],["06-window-patterns","Real-world window patterns"]] },
      { slug: "05-cte-and-recursion", order: 5, title: { en: "CTEs & recursion", ru: "CTE и рекурсия" },
        crux: { en: "WITH names a subquery; WITH RECURSIVE walks trees and graphs in pure SQL.", ru: "WITH именует подзапрос; WITH RECURSIVE обходит деревья и графы на чистом SQL." },
        lessons: [["01-cte-basics","CTE basics"],["02-cte-vs-subquery","CTE vs subquery"],["03-cte-materialization","CTE materialization"],["04-recursive-ctes","Recursive CTEs"],["05-graphs-in-sql","Walking graphs in SQL"]] },
      { slug: "06-types-and-modeling", order: 6, title: { en: "Types & modeling", ru: "Типы и моделирование" },
        crux: { en: "Postgres has a rich type system — model with it, not around it.", ru: "У Postgres богатая система типов — моделируй с ней, а не в обход." },
        lessons: [["01-core-types","Core types"],["02-constraints","Constraints"],["03-jsonb-deep","JSONB, deeply"],["04-arrays-and-enums","Arrays and enums"],["05-generated-and-identity","Generated and identity columns"],["06-schema-design","Schema design"]] },
      { slug: "07-transactions-concurrency", order: 7, title: { en: "Transactions & concurrency", ru: "Транзакции и конкурентность" },
        crux: { en: "Isolation levels are promises about what concurrent transactions can see.", ru: "Уровни изоляции — обещания о том, что видят конкурентные транзакции." },
        lessons: [["01-acid-in-practice","ACID in practice"],["02-isolation-levels","Isolation levels in Postgres"],["03-select-for-update","SELECT FOR UPDATE"],["04-advisory-locks","Advisory locks"],["05-deadlocks","Deadlocks"]] },
      { slug: "08-internals-and-tuning", order: 8, title: { en: "Internals & tuning", ru: "Внутренности и тюнинг" },
        crux: { en: "Read the plan, fix the estimate, watch the bloat — the tuning loop.", ru: "Читай план, чини оценку, следи за bloat — цикл тюнинга." },
        lessons: [["01-explain-analyze","EXPLAIN ANALYZE, deeply"],["02-the-planner","The query planner"],["03-statistics-and-estimates","Statistics and estimates"],["04-vacuum-and-bloat","VACUUM and bloat"],["05-wal-and-durability","WAL and durability"],["06-tuning-workflow","A query tuning workflow"]] },
      { slug: "09-putting-it-together", order: 9, title: { en: "Putting it together", ru: "Собираем вместе" },
        crux: { en: "Design and tune a real query system end to end.", ru: "Спроектируй и затюнь реальную систему запросов от начала до конца." },
        lessons: [["01-capstone-analytics-api","Capstone: an analytics query system"]] },
    ],
  },
  {
    slug: "js-engine", order: 21, color: "peach",
    title: { en: "JavaScript Engine internals", ru: "Внутренности движка JavaScript" },
    blurb: {
      en: "How V8 runs your code — parsing, bytecode, hidden classes, the JIT, garbage collection, and how to stay fast.",
      ru: "Как V8 исполняет твой код — парсинг, байткод, скрытые классы, JIT, сборка мусора и как оставаться быстрым.",
    },
    src: "https://v8.dev/docs",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "What a JS engine is, and why internals decide your app's speed.", ru: "Что такое движок JS и почему его внутренности решают скорость приложения." },
        lessons: [["01-what-an-engine-is","What a JS engine is"],["02-the-engine-landscape","The engine landscape: V8, JSC, SpiderMonkey"]] },
      { slug: "01-how-js-runs", order: 1, title: { en: "How JS runs", ru: "Как исполняется JS" },
        crux: { en: "Source becomes AST, then bytecode the interpreter runs — before any JIT.", ru: "Исходник → AST → байткод, который исполняет интерпретатор, ещё до JIT." },
        lessons: [["01-source-to-ast","Source to AST"],["02-lazy-parsing","Lazy parsing"],["03-ignition-bytecode","Ignition bytecode"],["04-interpreter-loop","The interpreter loop"]] },
      { slug: "02-values-and-memory", order: 2, title: { en: "Values & memory", ru: "Значения и память" },
        crux: { en: "How the engine packs numbers, pointers and objects into machine words.", ru: "Как движок упаковывает числа, указатели и объекты в машинные слова." },
        lessons: [["01-value-representation","Value representation"],["02-smis-and-doubles","SMIs and doubles"],["03-pointer-tagging","Pointer tagging"],["04-the-heap","The heap"],["05-string-internals","String internals"]] },
      { slug: "03-hidden-classes", order: 3, title: { en: "Hidden classes & ICs", ru: "Скрытые классы и IC" },
        crux: { en: "Objects with the same shape share a hidden class — that's what makes property access fast.", ru: "Объекты одной формы делят скрытый класс — это и ускоряет доступ к свойствам." },
        lessons: [["01-shapes-and-maps","Shapes and maps"],["02-shape-transitions","Shape transitions"],["03-property-access","Property access"],["04-inline-caches","Inline caches"],["05-mono-poly-mega","Mono-, poly- and megamorphism"]] },
      { slug: "04-the-jit", order: 4, title: { en: "The JIT", ru: "JIT" },
        crux: { en: "The engine speculates on types, compiles hot code, and deopts when wrong.", ru: "Движок спекулирует на типах, компилирует горячий код и деоптимизирует при ошибке." },
        lessons: [["01-tiers-and-warmup","Tiers and warmup"],["02-type-feedback","Type feedback"],["03-turbofan","TurboFan and sea of nodes"],["04-speculative-optimization","Speculative optimization"],["05-deoptimization","Deoptimization"],["06-osr","On-stack replacement"]] },
      { slug: "05-closures-scope", order: 5, title: { en: "Closures & scope", ru: "Замыкания и область видимости" },
        crux: { en: "Closures capture scope into heap-allocated contexts — with a real cost.", ru: "Замыкания захватывают область в heap-контексты — с реальной ценой." },
        lessons: [["01-scope-chains","Scope chains"],["02-closure-memory","Closure memory"],["03-context-allocation","Context allocation"],["04-call-site-polymorphism","Call-site polymorphism"]] },
      { slug: "06-garbage-collection", order: 6, title: { en: "Garbage collection", ru: "Сборка мусора" },
        crux: { en: "Generational GC bets most objects die young — invisible until it isn't.", ru: "Поколенческий GC ставит на то, что объекты умирают молодыми — невидим, пока не станет проблемой." },
        lessons: [["01-why-gc","Why GC"],["02-generational-orinoco","Generational GC and Orinoco"],["03-mark-sweep-compact","Mark, sweep, compact"],["04-write-barriers","Write barriers"],["05-memory-leaks","Memory leaks"],["06-measuring-heap","Measuring the heap"]] },
      { slug: "07-async-deep", order: 7, title: { en: "Async, deeply", ru: "Async вглубь" },
        crux: { en: "The event loop, microtasks and promise internals that decide execution order.", ru: "Event loop, микрозадачи и внутренности промисов, решающие порядок исполнения." },
        lessons: [["01-event-loop-recap","The event loop, recapped"],["02-microtasks-vs-macrotasks","Microtasks vs macrotasks"],["03-promise-internals","Promise internals"],["04-async-await-desugaring","async/await desugaring"]] },
      { slug: "08-measuring-optimizing", order: 8, title: { en: "Measuring & optimizing", ru: "Замеры и оптимизация" },
        crux: { en: "Use engine traces to keep code monomorphic and JIT-friendly.", ru: "Используй трейсы движка, чтобы держать код мономорфным и дружелюбным к JIT." },
        lessons: [["01-trace-opt-and-deopt","Tracing opt and deopt"],["02-monomorphism-discipline","Monomorphism discipline"],["03-benchmarking-pitfalls","Benchmarking pitfalls"],["04-real-world-wins","Real-world wins"]] },
      { slug: "09-putting-it-together", order: 9, title: { en: "Putting it together", ru: "Собираем вместе" },
        crux: { en: "Profile and optimize a real hot path with engine knowledge.", ru: "Профилируй и оптимизируй реальный hot path со знанием движка." },
        lessons: [["01-capstone-optimize-a-hotpath","Capstone: optimize a hot path"]] },
    ],
  },
  {
    slug: "typescript", order: 22, color: "sky",
    title: { en: "TypeScript type system, deep", ru: "Система типов TypeScript вглубь" },
    blurb: {
      en: "From structural typing to type-level programming — generics, conditional and mapped types, and typing real systems.",
      ru: "От структурной типизации до программирования на типах — дженерики, условные и отображённые типы, типизация реальных систем.",
    },
    src: "https://www.typescriptlang.org/docs/",
    units: [
      { slug: "00-start-here", order: 0, title: { en: "Start from zero", ru: "С нуля" },
        crux: { en: "What types buy you, and the two worlds: values and types.", ru: "Что дают типы и два мира: значения и типы." },
        lessons: [["01-why-types-deep","Why types, deeply"],["02-type-vs-value-space","Type space vs value space"]] },
      { slug: "01-foundations", order: 1, title: { en: "Foundations", ru: "Основы" },
        crux: { en: "TypeScript types are structural and mostly inferred.", ru: "Типы TypeScript структурны и в основном выводятся." },
        lessons: [["01-structural-typing","Structural typing"],["02-inference-basics","Inference basics"],["03-any-unknown-never","any, unknown and never"],["04-literal-types","Literal types"]] },
      { slug: "02-everyday-types", order: 2, title: { en: "Everyday types", ru: "Повседневные типы" },
        crux: { en: "Unions plus narrowing model 'one of these, figure out which'.", ru: "Объединения плюс сужение моделируют «одно из, выясни какое»." },
        lessons: [["01-unions-and-intersections","Unions and intersections"],["02-narrowing","Narrowing"],["03-type-guards","Type guards"],["04-discriminated-unions","Discriminated unions"],["05-index-access-types","Index access types"]] },
      { slug: "03-generics", order: 3, title: { en: "Generics", ru: "Дженерики" },
        crux: { en: "Generics are functions over types — with constraints and inference.", ru: "Дженерики — функции над типами с ограничениями и выводом." },
        lessons: [["01-generic-functions","Generic functions"],["02-constraints","Constraints"],["03-defaults-and-inference","Defaults and inference"],["04-generic-classes","Generic classes"],["05-variance-intuition","Variance intuition"]] },
      { slug: "04-type-system-deep", order: 4, title: { en: "The type system, deep", ru: "Система типов вглубь" },
        crux: { en: "Conditional, mapped and template-literal types make types programmable.", ru: "Условные, отображённые и template-literal типы делают типы программируемыми." },
        lessons: [["01-conditional-types","Conditional types"],["02-the-infer-keyword","The infer keyword"],["03-mapped-types","Mapped types"],["04-key-remapping","Key remapping"],["05-template-literal-types","Template literal types"]] },
      { slug: "05-type-level-programming", order: 5, title: { en: "Type-level programming", ru: "Программирование на типах" },
        crux: { en: "Recursion and distribution let you compute at the type level — within limits.", ru: "Рекурсия и дистрибутивность позволяют вычислять на уровне типов — в пределах лимитов." },
        lessons: [["01-recursion-in-types","Recursion in types"],["02-distributive-conditionals","Distributive conditionals"],["03-utility-types-from-scratch","Utility types from scratch"],["04-type-arithmetic","Type-level arithmetic"],["05-limits-and-perf","Limits and type performance"]] },
      { slug: "06-functions-this", order: 6, title: { en: "Functions & this", ru: "Функции и this" },
        crux: { en: "Overloads, this-typing, assertion functions and satisfies.", ru: "Перегрузки, типизация this, assertion-функции и satisfies." },
        lessons: [["01-overloads","Overloads"],["02-typing-this","Typing this"],["03-assertion-functions","Assertion functions"],["04-the-satisfies-operator","The satisfies operator"]] },
      { slug: "07-config-modules-build", order: 7, title: { en: "Config, modules & build", ru: "Конфиг, модули и сборка" },
        crux: { en: "tsconfig strictness and module resolution decide what compiles.", ru: "Строгость tsconfig и разрешение модулей решают, что компилируется." },
        lessons: [["01-tsconfig-strictness","tsconfig strictness"],["02-module-resolution","Module resolution"],["03-declaration-files","Declaration files"],["04-project-references","Project references"],["05-build-tooling","Build tooling"]] },
      { slug: "08-real-world", order: 8, title: { en: "Types in the real world", ru: "Типы на практике" },
        crux: { en: "Type the boundaries: APIs, validation, end-to-end with tRPC.", ru: "Типизируй границы: API, валидация, end-to-end с tRPC." },
        lessons: [["01-typing-apis","Typing APIs"],["02-zod-and-validation","Zod and runtime validation"],["03-trpc-end-to-end","tRPC end to end"],["04-library-generics","Generics in libraries"],["05-common-pitfalls","Common pitfalls"]] },
      { slug: "09-putting-it-together", order: 9, title: { en: "Putting it together", ru: "Собираем вместе" },
        crux: { en: "Build a fully-typed feature end to end.", ru: "Собери полностью типизированную фичу от начала до конца." },
        lessons: [["01-capstone-typed-feature","Capstone: a fully-typed feature"]] },
    ],
  },
];

function yaml(s) { return JSON.stringify(s); } // double-quoted, escapes safely

function stub(lang, track, unit, slug, order, title, src) {
  return `---
slug: ${yaml(slug)}
lang: ${lang}
track: ${yaml(track)}
unit: ${yaml(unit)}
order: ${order}
title: ${yaml(title)}
summary: ${yaml(title + " — stub; author to ready.")}
estMin: 12
status: stub
sources:
  - ${src}
---
`;
}

const tracksPath = join(C, "tracks.json");
const unitsPath = join(C, "units.json");
const tracks = JSON.parse(await readFile(tracksPath, "utf8"));
const units = JSON.parse(await readFile(unitsPath, "utf8"));
const trackSlugs = new Set(tracks.map((t) => t.slug));
const unitIds = new Set(units.map((u) => u.id));

let lessonsWritten = 0, lessonsSkipped = 0;

for (const t of SPEC) {
  if (!trackSlugs.has(t.slug)) {
    tracks.push({ slug: t.slug, order: t.order, color: t.color, title: t.title, blurb: t.blurb });
  }
  for (const u of t.units) {
    const id = `${t.slug}/${u.slug}`;
    if (!unitIds.has(id)) {
      units.push({
        id, slug: u.slug, track: t.slug, order: u.order,
        title: u.title, crux: u.crux,
        lessons: u.lessons.map((l) => l[0]),
        status: "stub",
      });
    }
    let i = 0;
    for (const [lslug, ltitle] of u.lessons) {
      i++;
      for (const lang of ["en", "ru"]) {
        const dir = join(C, "lessons", lang, t.slug, u.slug, lslug);
        const file = join(dir, "index.mdx");
        if (existsSync(file)) { lessonsSkipped++; continue; }
        await mkdir(dir, { recursive: true });
        await writeFile(file, stub(lang, t.slug, u.slug, lslug, i, ltitle, t.src));
        lessonsWritten++;
      }
    }
  }
}

await writeFile(tracksPath, JSON.stringify(tracks, null, 2) + "\n");
await writeFile(unitsPath, JSON.stringify(units, null, 2) + "\n");

const lessonCount = SPEC.reduce((a, t) => a + t.units.reduce((b, u) => b + u.lessons.length, 0), 0);
console.log(`tracks: +${SPEC.length}, units: +${SPEC.reduce((a, t) => a + t.units.length, 0)}, lessons defined: ${lessonCount} (×2 langs)`);
console.log(`stub files written: ${lessonsWritten}, skipped (exist): ${lessonsSkipped}`);
