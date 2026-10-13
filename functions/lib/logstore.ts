/**
 * D1 sink for the structured logger. `flushLogs` persists the sampled
 * survivors of a request's buffer; purge of rows older than 30 days is
 * opportunistic (~1% of non-empty flushes). Never throws: persistence
 * failures must never fail the request being logged.
 */
import { shouldPersist, type LogEntry } from "./logger";

const THIRTY_DAYS_MS = 30 * 86400 * 1000;
const PURGE_BATCH = 200;

export interface FlushOpts {
  /** Force (true) or skip (false) the purge; undefined = ~1% random draw. */
  purge?: boolean;
}

export async function flushLogs(
  env: { DB?: D1Database },
  buf: LogEntry[],
  opts: FlushOpts = {},
): Promise<void> {
  const keep = buf.filter((e) => shouldPersist(e.level, e.route));
  if (keep.length === 0 || !env.DB) return;
  try {
    for (const e of keep) {
      await env.DB.prepare(
        `INSERT INTO app_logs (ts, level, route, rid, flow, user_id, tag, msg, ctx_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(e.ts, e.level, e.route, e.rid, e.flow ?? null, e.user, e.tag, e.msg, JSON.stringify(e.ctx))
        .run();
    }
    const doPurge = opts.purge ?? Math.random() < 0.01;
    if (doPurge) {
      await env.DB.prepare(`DELETE FROM app_logs WHERE ts < ? LIMIT ${PURGE_BATCH}`)
        .bind(Date.now() - THIRTY_DAYS_MS)
        .run();
    }
  } catch {
    // Persistence failures never fail the request.
  }
}
