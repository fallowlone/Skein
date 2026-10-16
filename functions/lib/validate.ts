import { error } from "./response";

/**
 * Shared API-boundary validators. The deployed Functions dir must stay
 * dependency-free (wrangler bundles any node_modules and fails), so this is
 * hand-rolled on purpose — see the "hand-rolled vs zod" ADR. Every helper
 * returns a {ok} union with a stable machine code; routes map failures with
 * invalid() so all input-validation failures share one contract:
 * 422 + {error: code}. See the matrix in docs (M1): q_too_short, q_too_long,
 * bad_lang, bad_lesson_path, bad_page, bad_per_page, bad_json, bad_shape,
 * too_many, bad_event, invalid_nickname.
 */

export type Valid<T> = { ok: true; value: T };
export type Invalid = { ok: false; code: string };
export type Result<T> = Valid<T> | Invalid;

/** Map a validation failure to its HTTP response: 422 with a stable code. */
export function invalid(code: string): Response {
  return error(422, code);
}

/** Trimmed string within [min, max] chars. Non-strings fail with minCode. */
export function text(
  raw: unknown,
  opts: { min: number; max: number; code: string; maxCode?: string },
): Result<string> {
  const failMin: Invalid = { ok: false, code: opts.code };
  if (typeof raw !== "string") return failMin;
  const value = raw.trim();
  if (value.length < opts.min) return failMin;
  if (value.length > opts.max) return { ok: false, code: opts.maxCode ?? opts.code };
  return { ok: true, value };
}

/** String membership. Missing/unknown values fail with code. */
export function oneOf<T extends string>(
  raw: unknown,
  allowed: readonly T[],
  code: string,
): Result<T> {
  if (typeof raw === "string" && (allowed as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as T };
  }
  return { ok: false, code };
}

export interface IntOpts {
  min: number;
  max: number;
  code: string;
  /** Value used when raw is null/undefined (still bounded by min/max). */
  fallback?: number;
}

/** Integer query param within [min, max]. Rejects floats, junk, empties. */
export function int(raw: string | null, opts: IntOpts): Result<number> {
  if ((raw === null || raw === undefined) && opts.fallback !== undefined) {
    return { ok: true, value: opts.fallback };
  }
  if (typeof raw !== "string" || !/^-?\d+$/.test(raw.trim())) return { ok: false, code: opts.code };
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value) || value < opts.min || value > opts.max) {
    return { ok: false, code: opts.code };
  }
  return { ok: true, value };
}
