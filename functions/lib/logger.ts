/**
 * Structured per-request logger. Pure module (no I/O): handlers bind a
 * buffer once per request, log lines into it, and `_middleware` flushes it
 * to the D1 sink via `flushLogs` (see lib/logstore.ts).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogBase {
  route: string;
  rid: string;
  user?: number | null;
}

export interface LogEntry {
  ts: number;
  level: LogLevel;
  route: string;
  rid: string;
  flow?: string;
  user: number | null;
  tag: string;
  msg: string;
  ctx: Record<string, unknown>;
}

/** Serialized ctx larger than this is cut with a `truncated` marker. */
export const MAX_CTX_BYTES = 4000;

const REDACTED = "[redacted]";
const SECRET_KEY_RE = /secret|token|cookie|authorization|password/i;
const SECRET_VALUE_RES = [/^ghu_[A-Za-z0-9_]+$/, /^github_pat_[A-Za-z0-9_]+$/, /^sk-[A-Za-z0-9_-]+$/, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, /^sb_secret_[A-Za-z0-9_-]+$/, /^\d+:[A-Za-z0-9_-]{30,}$/, /^ghp_[A-Za-z0-9]+$/, /^gho_[A-Za-z0-9]+$/, /^ghc_[A-Za-z0-9]+$/];

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return SECRET_VALUE_RES.some((re) => re.test(value)) ? REDACTED : value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEY_RE.test(k) ? REDACTED : redact(v);
    }
    return out;
  }
  return value;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function levelEnabled(level: LogLevel, envLevel: string | undefined): boolean {
  const floor = LEVEL_ORDER[(envLevel as LogLevel) ?? "info"] ?? LEVEL_ORDER.info;
  return LEVEL_ORDER[level] >= floor;
}

const PERSIST_ALWAYS_RE = /^\/api\/(auth|admin|payments|telegram|coach)(?:\/|$)/;

export function shouldPersist(level: LogLevel, route: string): boolean {
  if (level === "error") return true;
  if (level === "debug") return false;
  if (level === "info") return PERSIST_ALWAYS_RE.test(route) || Math.random() < 0.01;
  return Math.random() < 0.1; // warn
}

function truncateCtx(ctx: Record<string, unknown>): Record<string, unknown> {
  let raw = JSON.stringify(ctx);
  if (raw.length <= MAX_CTX_BYTES) return ctx;
  // Shrink string values first; fall back to a hard cut if still too large.
  const shrunk: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    shrunk[k] = typeof v === "string" && v.length > 200 ? `${v.slice(0, 200)}…` : v;
  }
  raw = JSON.stringify(shrunk);
  if (raw.length <= MAX_CTX_BYTES) return { ...shrunk, truncated: true };
  try {
    return { ...JSON.parse(raw.slice(0, MAX_CTX_BYTES)), truncated: true } as Record<string, unknown>;
  } catch {
    return { raw: raw.slice(0, MAX_CTX_BYTES), truncated: true };
  }
}

export interface BoundLogger {
  log(level: LogLevel, tag: string, msg: string, ctx?: Record<string, unknown>): void;
  setUser(id: number | null): void;
}

export function bindLogger(buf: LogEntry[], base: LogBase): BoundLogger {
  let user = base.user ?? null;
  return {
    setUser(id: number | null) {
      user = id;
    },
    log(level, tag, msg, ctx = {}) {
      const redacted = redact(ctx) as Record<string, unknown>;
      const { flow, ...rest } = redacted;
      buf.push({
        ts: Date.now(),
        level,
        route: base.route,
        rid: base.rid,
        ...(typeof flow === "string" ? { flow } : {}),
        user,
        tag,
        msg,
        ctx: truncateCtx(rest),
      });
    },
  };
}
