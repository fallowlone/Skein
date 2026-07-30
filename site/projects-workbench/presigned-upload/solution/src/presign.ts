import { createHmac, timingSafeEqual } from "node:crypto";

export type PresignRequest = {
  key: string;
  contentType: string;
  maxBytes: number;
  expiresAt: number;
};

export type Presigned = PresignRequest & { signature: string };

export type PutAttempt = {
  key: string;
  contentType: string;
  contentLength: number;
  signature: string;
  now: number;
};

export type VerifyResult =
  | { ok: true }
  | { ok: false; error: "expired" | "bad_signature" | "content_type_mismatch" | "too_large" | "key_mismatch" };

/**
 * Canonical string to sign.
 *
 * Every constraint the URL claims to enforce must be INSIDE the signature.
 * Anything left out is a field the client can rewrite: sign only the key and the
 * expiry, and the caller happily uploads a 4 GB executable as `image/png`.
 * Field separators matter too — without them `key="a", type="b/c"` and
 * `key="a b", type="/c"` hash to the same string.
 */
export function canonicalString(req: PresignRequest): string {
  return [`key=${req.key}`, `type=${req.contentType}`, `max=${req.maxBytes}`, `exp=${req.expiresAt}`].join("\n");
}

export function presign(req: PresignRequest, secret: string): Presigned {
  const signature = createHmac("sha256", secret).update(canonicalString(req), "utf8").digest("hex");
  return { ...req, signature };
}

function signaturesMatch(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * Server-side check of an incoming PUT.
 *
 * Order matters for what an attacker learns: expiry and signature are checked
 * before any of the constraint comparisons, so a forged request cannot use the
 * error message to probe which constraint it violated.
 */
export function verifyPut(attempt: PutAttempt, granted: PresignRequest, secret: string): VerifyResult {
  if (granted.expiresAt <= attempt.now) return { ok: false, error: "expired" };

  const expected = presign(granted, secret).signature;
  if (!signaturesMatch(attempt.signature, expected)) return { ok: false, error: "bad_signature" };

  if (attempt.key !== granted.key) return { ok: false, error: "key_mismatch" };
  if (attempt.contentType !== granted.contentType) return { ok: false, error: "content_type_mismatch" };
  if (attempt.contentLength > granted.maxBytes) return { ok: false, error: "too_large" };
  return { ok: true };
}

export type ObjectMeta = { key: string; size: number; etag: string };

export type ReceiptResult =
  | { ok: true }
  | { ok: false; error: "missing" | "size_mismatch" | "etag_mismatch" };

/**
 * Confirm receipt from the store's own metadata, not from the client.
 *
 * The client reporting "upload done" proves nothing: it never uploaded, uploaded
 * something else, or uploaded half. The server asks the bucket what actually landed
 * and compares against what it granted.
 */
export function confirmReceipt(
  meta: ObjectMeta | null,
  expected: { key: string; size: number; etag: string },
): ReceiptResult {
  if (!meta) return { ok: false, error: "missing" };
  if (meta.key !== expected.key) return { ok: false, error: "missing" };
  if (meta.size !== expected.size) return { ok: false, error: "size_mismatch" };
  if (meta.etag !== expected.etag) return { ok: false, error: "etag_mismatch" };
  return { ok: true };
}

/**
 * Object keys are derived server-side, never taken from the client filename.
 *
 * A client-supplied key is a path-traversal and overwrite primitive: `../../` walks
 * out of the prefix, and a fixed name lets one user clobber another's object.
 */
export function safeKey(prefix: string, userId: string, filename: string, random: string): string {
  const ext = /\.([a-zA-Z0-9]{1,8})$/.exec(filename)?.[1]?.toLowerCase() ?? "bin";
  return `${prefix}/${userId}/${random}.${ext}`;
}
