#!/usr/bin/env bun
/**
 * Phase-1 Supabase mirror: push canonical content (site/src/content/**) into the
 * `curriculum` schema. Files stay the single source of truth; this tool only
 * ever writes the mirror. See docs/2026-08-20-supabase-content-migration.md.
 *
   * Usage (from site/):
 *   bun scripts/supabase/sync-content.ts --help
 *   bun scripts/supabase/sync-content.ts --dry-run                     # offline diff (no keys needed)
 *   bun scripts/supabase/sync-content.ts --dry-run --ledger-file ../build-cache/supabase-ledger.json
 *   bun scripts/supabase/sync-content.ts                               # real sync (needs url + key)
 *   bun scripts/supabase/sync-content.ts --force --limit 50            # first 50 rows anyway
 *   bun scripts/supabase/sync-content.ts --only lessons                # one collection
 *   bun scripts/supabase/sync-content.ts --prune                       # drop rows for deleted files
 *
 * Env: SUPABASE_URL + SUPABASE_SECRET_KEY (real env or site/.env.local).
 */
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  materialize,
  diffRows,
  chunkByBytes,
  ledgerKeyToPk,
  KINDS,
  type CorpusKind,
  type CourseRow,
  type Ledger,
} from "./corpus.ts";
import {
  TABLE_COLUMNS,
  loadEnv,
  makeClient,
  readEnvLocal,
  schemaTable,
  selectAll,
  CURRICULUM_SCHEMA,
} from "./supabase.ts";

const SITE_ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

interface Args {
  dryRun: boolean;
  force: boolean;
  prune: boolean;
  help: boolean;
  limit: number;
  only: string[];
  ledgerFile: string | null;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    force: false,
    prune: false,
    help: false,
    limit: 0,
    only: [],
    ledgerFile: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--force") args.force = true;
    else if (a === "--prune") args.prune = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--limit") args.limit = Math.max(0, Number(argv[++i]) || 0);
    else if (a === "--only") args.only = (argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--ledger-file") args.ledgerFile = argv[++i];
    else {
      console.error(`unknown flag: ${a}`);
      args.help = true;
    }
  }
  const bad = args.only.filter((k) => !(KINDS as readonly string[]).includes(k));
  if (bad.length) {
    console.error(`unknown collection(s): ${bad.join(", ")} (valid: ${KINDS.join(", ")})`);
    args.help = true;
  }
  return args;
}

function usage(): void {
  console.log(
    `sync-content: push the site content corpus into the Supabase \`curriculum\` schema.\n` +
      `  --dry-run                offline diff against the ledger; no network, no writes\n` +
      `  --force                  treat every row as changed (ignore ledger hashes)\n` +
      `  --limit N                only sync the first N changed rows\n` +
      `  --only a,b               restrict to collections: ${KINDS.join(", ")}\n` +
      `  --ledger-file path       use a JSON {ledgerKey: hash} map instead of the live sync_log\n` +
      `  --prune                  also delete mirrored rows whose files no longer exist locally\n` +
      `  --help                   this help\n` +
      `\nEnv: SUPABASE_URL + SUPABASE_SECRET_KEY (env or site/.env.local).`,
  );
}

function countByKind(rows: readonly CourseRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) out[r.kind] = (out[r.kind] ?? 0) + 1;
  return out;
}

function groupByKind(rows: readonly CourseRow[]): Map<string, CourseRow[]> {
  const out = new Map<string, CourseRow[]>();
  for (const r of rows) {
    const list = out.get(r.kind) ?? [];
    list.push(r);
    out.set(r.kind, list);
  }
  return out;
}

/** Payload budget per PostgREST request. Lesson bodies average ~17 KB. */
const MAX_BATCH_BYTES = 2_000_000;
const MAX_BATCH_ROWS = 400;

async function upsertTable(
  client: ReturnType<typeof makeClient>,
  table: string,
  payloads: readonly Record<string, unknown>[],
  conflict: string,
): Promise<number> {
  let total = 0;
  const batches = chunkByBytes(payloads, MAX_BATCH_BYTES, MAX_BATCH_ROWS);
  for (let i = 0; i < batches.length; i++) {
    const { error } = await schemaTable(client, CURRICULUM_SCHEMA, table)
      .upsert(batches[i] as unknown[], { onConflict: conflict });
    if (error) throw new Error(`upsert ${table} failed: ${error.message}`);
    total += batches[i].length;
    if (i > 0 && i % 5 === 0) await new Promise((r) => setTimeout(r, 150));
  }
  return total;
}
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return usage();

  const local = await readEnvLocal(SITE_ROOT);
  const { url, key } = loadEnv(process.env, local);

  // ── 1. Materialize + diff against a ledger ───────────────────────────────
  const all = await materialize(SITE_ROOT);
  const rows = args.only.length ? all.filter((r) => args.only.includes(r.kind)) : all;

  const t0 = Date.now();
  let ledger: Ledger = new Map();
  if (args.ledgerFile) {
    const raw = await readFile(join(SITE_ROOT, args.ledgerFile), "utf8");
    ledger = new Map(Object.entries(JSON.parse(raw)));
    console.log(`[sync] ledger: ${ledger.size} entries from ${args.ledgerFile}`);
  } else if (args.dryRun) {
    console.log("[sync] dry-run assumes an empty ledger (first sync) unless --ledger-file is given.");
  } else if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_SECRET_KEY.\n" +
        "  Set them in site/.env.local (gitignored) or export them in CI. Dry-run needs neither.",
    );
    process.exit(2);
  } else {
    const client = makeClient(url, key);
    let data: unknown[];
    try {
      data = await selectAll(
        () => schemaTable(client, CURRICULUM_SCHEMA, "sync_log"),
        "ledger_key,content_hash,kind",
      );
    } catch (err) {
      throw new Error(`read sync_log failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    ledger = new Map(
      (data as Array<Record<string, unknown>>).map((r) => [
        r.ledger_key as string,
        r.content_hash as string,
      ]),
    );
    console.log(`[sync] ledger: ${ledger.size} rows in curriculum.sync_log`);
  }

  const kinds: readonly CorpusKind[] = args.only.length
    ? (args.only as CorpusKind[])
    : KINDS;
  const { changed, removed, unchanged } = diffRows(rows, ledger, {
    force: args.force,
    kinds,
  });
  const limited = args.limit > 0 ? changed.slice(0, args.limit) : changed;

  // ── 2. Dry-run: report only ─────────────────────────────────────────────
  if (args.dryRun) {
    const totals = countByKind(rows);
    const changeCounts = countByKind(limited);
    const lines = KINDS.filter((k) => !args.only.length || args.only.includes(k)).map(
      (k) =>
        `  ${k.padEnd(10)} ${String(changeCounts[k] ?? 0).padStart(5)} changed  ` +
        `${String(totals[k] ?? 0).padStart(5)} total`,
    );
    console.log(
      `[dry-run] would change ${limited.length} row(s) (${unchanged} unchanged, ` +
        `${removed.length} removable with --prune)`,
    );
    console.log(lines.join("\n"));
    return;
  }

  // ── 3. Real sync ────────────────────────────────────────────────────────
  if (!url || !key) {
    console.error("Missing SUPABASE_URL / SUPABASE_SECRET_KEY.");
    process.exit(2);
  }
  const client = makeClient(url, key);

  let total = 0;
  for (const [kind, payload] of groupByKind(limited)) {
    if (!payload.length) continue;
    const { conflict } = TABLE_COLUMNS[kind as keyof typeof TABLE_COLUMNS];
    const n = await upsertTable(client, kind, payload.map((r) => r.row), conflict);
    total += n;
    console.log(`[sync] ${kind}: upserted ${n} rows`);
  }

  if (limited.length) {
    const ledgerRows = limited.map((r) => ({
      ledger_key: r.ledgerKey,
      kind: r.kind,
      content_hash: r.hash,
    }));
    await upsertTable(client, "sync_log", ledgerRows, "ledger_key");
    console.log(`[sync] sync_log: ${ledgerRows.length} ledger entries written`);
  }
// ── 4. Prune deleted files (opt-in) ─────────────────────────────────────
  if (args.prune && removed.length) {
    let pruned = 0;
    let skipped = 0;
    for (const { ledgerKey, kind } of removed) {
      if (!kind) {
        skipped += 1; // ledger entry naming no known table — leave it alone
        continue;
      }
      const where = ledgerKeyToPk(kind, ledgerKey);
      const table = schemaTable(client, CURRICULUM_SCHEMA, kind);
      let q = table.delete();
      for (const [col, val] of Object.entries(where)) q = q.eq(col, val);
      const { error } = await q;
      if (error) throw new Error(`delete ${kind} ${ledgerKey} failed: ${error.message}`);
      const { error: ledgerErr } = await schemaTable(client, CURRICULUM_SCHEMA, "sync_log")
        .delete()
        .eq("ledger_key", ledgerKey);
      if (ledgerErr) throw new Error(`delete sync_log ${ledgerKey} failed: ${ledgerErr.message}`);
      pruned += 1;
    }
    console.log(
      `[sync] prune: removed ${pruned} rows` +
        (skipped ? ` (${skipped} skipped — unknown table)` : ""),
    );
  }

  console.log(
    `[sync] done in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${total} rows upserted, ` +
      `${unchanged} unchanged, ${args.prune ? removed.length : "not pruned (" + removed.length + " removable)"}`,
  );
}

main().catch((err) => {
  console.error(`[sync] failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});