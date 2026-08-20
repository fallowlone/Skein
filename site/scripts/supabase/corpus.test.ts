import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { writeFile, mkdir, mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import {
  sha256,
  classify,
  walkCorpus,
  materialize,
  lessonRow,
  tracksRows,
  unitsRows,
  labRow,
  rowFor,
  diffRows,
  ledgerKeyToPk,
  pkToLedgerKey,
  splitFrontmatter,
  parseFrontmatter,
  ledgerKeyKind,
  chunkByBytes,
  mdxToProse,
  type CourseRow,
} from "./corpus";

const KNOWN_SHA256_EMPTY =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const LESSON_MDX = `---
concepts:
- array
- index
deepensInto: []
estMin: 15
lang: en
lessonType: topic
level: zero
mathPrereqs: []
order: 1
prereqs:
- 01-thinking-complexity/04-big-o-notation
slug: 01-the-array
sources:
- https://example.com/array
summary: 'An array is a row of boxes in memory. Because the
  boxes are contiguous, you jump to any box in O(1).'
title: The array
track: algorithms
unit: 02-arrays-strings
---
# Body

Hello *world*.
`;

const LESSON_MDX_RU = `---
lang: ru
track: algorithms
unit: 02-arrays-strings
slug: 01-the-array
order: 1
title: Массив
summary: 'Кратко о массиве.'
estMin: 15
sources:
- https://example.com/array
---
Тело.
`;

let site: string;

beforeAll(async () => {
  site = await mkdtemp(join(tmpdir(), "corpus-fixture-"));
    const w = (p: string, data: string) =>
    mkdir(dirname(join(site, p)), { recursive: true }).then(() =>
      writeFile(join(site, p), data),
    );
      await w("src/content/tracks.json", JSON.stringify([{ slug: "algorithms", order: 1, color: "sky", title: { en: "Algo", ru: "Алг" }, blurb: { en: "b", ru: "б" } }]));
  await w("src/content/units.json", JSON.stringify([{ id: "algorithms/02-arrays-strings", slug: "02-arrays-strings", track: "algorithms", order: 1, title: { en: "U", ru: "У" }, crux: { en: "c", ru: "с" }, lessons: ["01"] }]));
  await w("src/content/lessons/en/algorithms/02-arrays-strings/01/index.mdx", LESSON_MDX);
  await w("src/content/lessons/ru/algorithms/02-arrays-strings/01/index.mdx", LESSON_MDX_RU);
  await w("src/content/practice/algorithms/02-arrays-strings/01.json", JSON.stringify({ lessonKey: "algorithms/02-arrays-strings/01", track: "algorithms", tasks: [{ id: "t1", type: "predict", difficulty: "recall", estMin: 3, title: { en: "T", ru: "Т" }, prompt: { en: "P", ru: "П" }, scenario: { en: "S", ru: "С" }, reveal: { en: "R", ru: "Р" } }] }));
  await w("src/content/projects/toy.json", JSON.stringify({ slug: "toy-http-server", title: { en: "Toy", ru: "Игрушка" }, pitch: { en: "p", ru: "п" }, category: "backend" }));
  await w("src/content/drill/algorithms/02-arrays-strings.json", JSON.stringify({ track: "algorithms", unit: "02-arrays-strings", patterns: ["arrays-hashing"], intro: { en: "i", ru: "и" }, problems: [] }));
  await w("src/content/lab/node.json", JSON.stringify({ track: "node", tier: "build", order: 1, title: { en: "B", ru: "С" }, intro: { en: "i", ru: "и" }, challenges: [] }));
  await w("src/content/personas.json", "not-corpus"); // decoy — must be skipped
});

afterAll(() => rm(site, { recursive: true, force: true }));

describe("sha256", () => {
  it("hashes empty input to the known constant", () => {
    expect(sha256("")).toBe(KNOWN_SHA256_EMPTY);
    expect(sha256(new Uint8Array([]))).toBe(KNOWN_SHA256_EMPTY);
  });
  it("is deterministic and content-derived", () => {
    expect(sha256("hello")).toBe(sha256("hello"));
    expect(sha256("hello")).not.toBe(sha256("world"));
  });
});

describe("classify", () => {
  it("maps canonical paths to their kind and ignores the rest", () => {
    expect(classify("src/content/tracks.json")).toBe("tracks");
    expect(classify("src/content/units.json")).toBe("units");
    expect(classify("src/content/lessons/ru/x/y/z/index.mdx")).toBe("lessons");
    expect(classify("src/content/practice/x/y.json")).toBe("practice");
    expect(classify("src/content/projects/x.json")).toBe("projects");
    expect(classify("src/content/drill/x/y.json")).toBe("drill");
    expect(classify("src/content/lab/x.json")).toBe("lab");
    expect(classify("src/content/personas.json")).toBeNull();
    expect(classify("src/content/config.test.ts")).toBeNull();
  });
});

describe("walkCorpus", () => {
  it("finds exactly the corpus files (decoy skipped)", async () => {
    const files = await walkCorpus(site);
    const counts: Record<string, number> = {};
    for (const f of files) counts[f.kind] = (counts[f.kind] ?? 0) + 1;
    expect(counts).toEqual({ tracks: 1, units: 1, lessons: 2, practice: 1, projects: 1, drill: 1, lab: 1 });
        expect(files.every((f) => /^[0-9a-f]{64}$/.test(f.hash))).toBe(true);
  });
});

describe("materialize", () => {
  it("builds one row per file (2 lessons)", async () => {
    const rows = await materialize(site);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.kind] = (counts[r.kind] ?? 0) + 1;
    expect(counts).toEqual({ tracks: 1, units: 1, lessons: 2, practice: 1, projects: 1, drill: 1, lab: 1 });
    expect(rows).toHaveLength(8);
  });
});

describe("lessonRow", () => {
  const en = "src/content/algorithms/02-arrays-strings/01/index.mdx";
  it("maps frontmatter to columns, defaults status, splits meta + body", async () => {
    const raw = await readFile(join(site, "src/content/lessons/en", "algorithms/02-arrays-strings/01/index.mdx"), "utf8");
    const row = lessonRow(raw, en, "H");
    const r = row.row as Record<string, unknown>;
    expect(row.kind).toBe("lessons");
        expect(row.ledgerKey).toBe(`lessons#en/algorithms/02-arrays-strings/01-the-array`);
    expect(r.lang).toBe("en");
    expect(r.track).toBe("algorithms");
    expect(r.unit).toBe("02-arrays-strings");
    expect(r.slug).toBe("01-the-array");
    expect(r.order_no).toBe(1);
    expect(r.est_min).toBe(15);
        expect(r.status).toBe("stub");  // EN fixture omits status → default
    expect(r.lesson_type).toBe("topic");
    expect(r.level).toBe("zero");
    expect(r.title).toBe("The array");
    expect((r.meta as Record<string, unknown>)).toMatchObject({
      prereqs: ["01-thinking-complexity/04-big-o-notation"],
      sources: ["https://example.com/array"],
    });
    expect((r.body as string).includes("# Body")).toBe(true);
    expect(r.body_hash).toBe(sha256(r.body as string));
    expect(r.content_hash).toBe("H");
  });

  it("defaults status to stub and omits absent optional fields (ru)", async () => {
    const raw = await readFile(join(site, "src/content/lessons/ru", "algorithms/02-arrays-strings/01/index.mdx"), "utf8");
    const row = lessonRow(raw, "ru-rel", "H");
    const r = row.row as Record<string, unknown>;
        expect(r.status).toBe("stub");
    expect(r.lesson_type).toBeNull();
    expect(r.level).toBeNull();
    expect(r.meta).toMatchObject({ sources: ["https://example.com/array"] });
    expect(r.meta).not.toHaveProperty("concepts");
  });

  it("carries a prose-only body_text alongside the raw body", async () => {
    const raw = await readFile(
      join(site, "src/content/lessons/en", "algorithms/02-arrays-strings/01/index.mdx"),
      "utf8",
    );
    const r = lessonRow(raw, en, "H").row as Record<string, unknown>;
    expect(r.body).toContain("# Body");          // raw body keeps markdown
    expect(r.body_text).toBe("Body Hello world."); // prose is stripped
    expect(typeof r.body_text).toBe("string");
  });

  it("body_hash still hashes the RAW body, not the prose", async () => {
    const raw = await readFile(
      join(site, "src/content/lessons/en", "algorithms/02-arrays-strings/01/index.mdx"),
      "utf8",
    );
    const r = lessonRow(raw, en, "H").row as Record<string, unknown>;
    expect(r.body_hash).toBe(sha256(r.body as string));
    expect(r.body_hash).not.toBe(sha256(r.body_text as string));
  });
});

describe("multi-entry rows + ledger keys", () => {
  it("tracks/units/lab use namespaced keys + (track,tier) for lab", async () => {
    const [tracksRow] = tracksRows(await readFile(join(site, "src/content/tracks.json"), "utf8"), "src/content/tracks.json");
    expect(tracksRow.ledgerKey).toBe("tracks#algorithms");

    const [unitsRow] = unitsRows(await readFile(join(site, "src/content/units.json"), "utf8"), "src/content/units.json");
    expect(unitsRow.ledgerKey).toBe("units#algorithms/02-arrays-strings");

    const [labRowOut] = [labRow(JSON.stringify({ track: "node", tier: "build", order: 1 }), "src/content/lab/node.json", "H2")];
    expect(labRowOut.ledgerKey).toBe("lab#node/build");
    expect(labRowOut.row).toMatchObject({ track: "node", tier: "build", content_hash: "H2" });
  });
});

describe("rowFor + pk round-trip", () => {
  it("every row's ledgerKey re-derives its PK back to itself", async () => {
    const files = await walkCorpus(site);
    const rows = (await Promise.all(files.map(async (f) => rowFor(f, await readFile(join(site, f.rel), "utf8"))))).flat();
    for (const r of rows) {
          expect(pkToLedgerKey(r.kind, ledgerKeyToPk(r.kind, r.ledgerKey))).toBe(r.ledgerKey);
    }
  });
});

describe("splitFrontmatter / parseFrontmatter", () => {
  it("returns whole text as body when no frontmatter fence", () => {
    const { fm, body } = splitFrontmatter("no frontmatter here");
    expect(fm).toBe("");
    expect(body).toBe("no frontmatter here");
  });

  it("parses YAML scalars, arrays, folded strings; body excludes fence", () => {
    const { data, body } = parseFrontmatter(LESSON_MDX);
    expect(data.lang).toBe("en");
    expect(data.prereqs).toEqual(["01-thinking-complexity/04-big-o-notation"]);
    expect(data.summary).toContain("contiguous");
    expect(body.startsWith("# Body")).toBe(true);
  });
});

describe("diffRows", () => {
  let rows: CourseRow[];
  beforeAll(async () => { rows = await materialize(site); });

  it("reports everything changed against an empty ledger", () => {
    const { changed, unchanged, removed } = diffRows(rows, new Map());
    expect(changed).toHaveLength(rows.length);
    expect(unchanged).toBe(0);
    expect(removed).toHaveLength(0);
  });

  it("reports nothing changed when the ledger matches", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    const { changed, unchanged } = diffRows(rows, ledger);
    expect(changed).toHaveLength(0);
    expect(unchanged).toBe(rows.length);
  });

  it("reports exactly one row changed when one hash drifts", () => {
    const target = rows[0];
    const ledger = new Map(
      rows.map((r) => [r.ledgerKey, r.ledgerKey === target.ledgerKey ? "stale" : r.hash]),
    );
    const { changed, unchanged } = diffRows(rows, ledger);
    expect(changed).toHaveLength(1);
    expect(changed[0].ledgerKey).toBe(target.ledgerKey);
    expect(unchanged).toBe(rows.length - 1);
  });

  it("force flips every row to changed even when hashes match", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    const { changed } = diffRows(rows, ledger, { force: true });
    expect(changed).toHaveLength(rows.length);
  });

  it("detects removed rows whose files no longer exist", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    ledger.set("ghost#key", "x");
    const { removed } = diffRows(rows, ledger);
    expect(removed).toHaveLength(1);
    expect(removed[0].ledgerKey).toBe("ghost#key");
  });
});


describe("ledgerKeyKind", () => {
  it("recovers the corpus kind from a namespaced ledger key", () => {
    expect(ledgerKeyKind("lessons#en/algorithms/02-arrays/01")).toBe("lessons");
    expect(ledgerKeyKind("practice#algorithms/02-arrays/01")).toBe("practice");
    expect(ledgerKeyKind("lab#node/build")).toBe("lab");
  });

  it("returns null for keys that name no known table", () => {
    expect(ledgerKeyKind("ghost#key")).toBeNull();
    expect(ledgerKeyKind("no-separator")).toBeNull();
  });
});

describe("diffRows kind scoping (--only must not mark other kinds removable)", () => {
  let rows: CourseRow[];
  beforeAll(async () => { rows = await materialize(site); });

  it("does not report out-of-scope ledger entries as removed", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    const lessonsOnly = rows.filter((r) => r.kind === "lessons");
    // Without scoping, every non-lesson ledger entry looks deleted.
    const { removed } = diffRows(lessonsOnly, ledger, { kinds: ["lessons"] });
    expect(removed).toHaveLength(0);
  });

  it("still reports in-scope deletions when scoped", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    ledger.set("lessons#en/algorithms/02-arrays-strings/99-gone", "x");
    const lessonsOnly = rows.filter((r) => r.kind === "lessons");
    const { removed } = diffRows(lessonsOnly, ledger, { kinds: ["lessons"] });
    expect(removed).toHaveLength(1);
    expect(removed[0].ledgerKey).toBe("lessons#en/algorithms/02-arrays-strings/99-gone");
  });

  it("carries the kind on each removed entry so pruning needs no side table", () => {
    const ledger = new Map(rows.map((r) => [r.ledgerKey, r.hash]));
    ledger.set("practice#algorithms/02-arrays-strings/99-gone", "x");
    const { removed } = diffRows(rows, ledger);
    expect(removed).toEqual([
      { ledgerKey: "practice#algorithms/02-arrays-strings/99-gone", kind: "practice" },
    ]);
  });
});

describe("chunkByBytes", () => {
  it("splits on the byte budget, never emitting an empty batch", () => {
    const big = { body: "x".repeat(1000) };
    const batches = chunkByBytes([big, big, big], 1500, 100);
    expect(batches.flat()).toHaveLength(3);
    expect(batches.every((b) => b.length > 0)).toBe(true);
    expect(batches.length).toBeGreaterThan(1);
  });

  it("keeps an oversized single row in its own batch rather than dropping it", () => {
    const huge = { body: "x".repeat(5000) };
    const batches = chunkByBytes([huge], 1000, 100);
    expect(batches).toEqual([[huge]]);
  });

  it("caps batches by row count even when rows are tiny", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ i }));
    const batches = chunkByBytes(rows, 10_000_000, 10);
    expect(batches.map((b) => b.length)).toEqual([10, 10, 5]);
  });
});

describe("mdxToProse", () => {
  it("drops fenced code blocks entirely", () => {
    const out = mdxToProse("Before\n\n```js\nconst syn = 1;\n```\n\nAfter");
    expect(out).toBe("Before After");
    expect(out).not.toContain("const");
  });

  it("keeps inline code tokens — engineers search for identifiers", () => {
    expect(mdxToProse("Send a `SYN` packet")).toBe("Send a SYN packet");
  });

  it("drops JSX tags but keeps their text children", () => {
    expect(mdxToProse('A <Term k="tcp">handshake</Term> here')).toBe("A handshake here");
  });

  it("drops import and export lines", () => {
    expect(mdxToProse('import X from "~/y";\n\nReal prose.')).toBe("Real prose.");
    expect(mdxToProse("export const a = 1;\n\nReal prose.")).toBe("Real prose.");
  });

  it("keeps link text and drops the URL", () => {
    expect(mdxToProse("See [the RFC](https://example.com/rfc793) now")).toBe("See the RFC now");
  });

  it("strips heading, emphasis and blockquote syntax", () => {
    expect(mdxToProse("## Title\n\n**bold** and _thin_\n\n> quoted")).toBe("Title bold and thin quoted");
  });

  it("drops JSX expression braces", () => {
    expect(mdxToProse("Value {someExpr} here")).toBe("Value here");
  });

  it("collapses whitespace and trims", () => {
    expect(mdxToProse("a\n\n\n   b\t\tc  ")).toBe("a b c");
  });

  it("returns empty string for empty input", () => {
    expect(mdxToProse("")).toBe("");
  });

  it("preserves Cyrillic prose unchanged", () => {
    expect(mdxToProse("Это **рукопожатие** TCP")).toBe("Это рукопожатие TCP");
  });

  it("keeps snake_case identifiers intact", () => {
    expect(mdxToProse("Set `max_rows` and db_schemas now")).toBe("Set max_rows and db_schemas now");
  });

  it("still strips underscore emphasis at word boundaries", () => {
    expect(mdxToProse("a _stressed_ word")).toBe("a stressed word");
  });
});
