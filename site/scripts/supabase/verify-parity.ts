#!/usr/bin/env bun
/**
 * Parity gate for the Supabase content mirror (Phase 1).
 * Fetches content_hash per `curriculum` table and compares against the local
 * corpus. Any missing / extra / drifted row fails the gate.
 *
   * Usage (from site/):
 *   bun scripts/supabase/verify-parity.ts --sample 100   # first N rows per table
 *   bun scripts/supabase/verify-parity.ts                # full compare (default)
 *
 * Env: SUPABASE_URL + SUPABASE_SECRET_KEY (real env or site/.env.local).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { materialize, KINDS, type CorpusKind, pkToLedgerKey } from "./corpus.ts";
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

function sampleValue(): number {
  const i = process.argv.indexOf("--sample");
  if (i < 0) return 0;
  const n = Number(process.argv[i + 1] ?? "0");
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

async function main(): Promise<void> {
  const sample = sampleValue();
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(
      "verify-parity: compare local corpus hashes against the Supabase curriculum tables.\n" +
        "  --sample N   check only the first N local rows per table (CI smoke)\n" +
        "  --help       this help",
    );
    return;
  }

  const local = await readEnvLocal(SITE_ROOT);
  const { url, key } = loadEnv(process.env, local);
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_SECRET_KEY.\n" +
        "  Set them in site/.env.local (gitignored) or export them in CI.",
    );
    process.exit(2);
  }
  const client = makeClient(url, key);

  const rows = await materialize(SITE_ROOT);
    const localByKind = new Map<CorpusKind, Map<string, string>>();
  for (const k of KINDS) localByKind.set(k, new Map());
  for (const r of rows) localByKind.get(r.kind)!.set(r.ledgerKey, r.hash);

  let bad = 0;
  for (const kind of KINDS) {
    const { select } = TABLE_COLUMNS[kind];
    let data: unknown[];
    try {
      data = await selectAll(() => schemaTable(client, CURRICULUM_SCHEMA, kind), select);
    } catch (err) {
      console.error(
        `[parity] ${kind}: fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      bad += 1;
      continue;
    }
    const localRows = localByKind.get(kind)!;
    const remote = new Map<string, string>();
    for (const row of data) {
      const r = row as Record<string, unknown>;
      remote.set(pkToLedgerKey(kind, r), String(r.content_hash));
    }

    let keys = [...localRows.keys()];
    if (sample > 0) keys = keys.slice(0, sample);
    let missing = 0;
    let drift = 0;
    for (const k of keys) {
      const rh = remote.get(k);
      if (rh === undefined) {
        missing += 1;
        continue;
      }
      if (rh !== localRows.get(k)) drift += 1;
    }
    let extra = 0;
    for (const k of remote.keys()) {
      if (!localRows.has(k)) extra += 1;
    }
    const note = sample > 0 ? ` (of ${localRows.size} local)` : "";
    console.log(
      `[parity] ${kind.padEnd(10)} local ${String(keys.length).padStart(5)}${note}` +
        `  remote ${String(remote.size).padStart(5)}  missing ${missing}  drift ${drift}  extra ${extra}`,
    );
    bad += missing + drift + extra;
  }

  if (bad) {
    console.error(`[parity] RESULT: FAIL — ${bad} mismatch(es). Run "bun run sync:supabase" to repair.`);
    process.exit(1);
  }
  console.log(`[parity] RESULT: OK${sample > 0 ? ` (sampled up to ${sample}/table)` : " (full)"} — no drift.`);
}

// Keep pure helpers importable (tests); only run main when executed directly.
export { main as runVerify };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[verify-parity] failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}