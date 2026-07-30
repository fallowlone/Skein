import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** RFC 7636 §4.1: 43–128 chars from the unreserved set, high entropy. */
export const VERIFIER_MIN_LEN = 43;
export const VERIFIER_MAX_LEN = 128;

/** base64url without padding — RFC 7636 uses it for both verifier and challenge. */
export function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 32 random bytes → 43 base64url chars, the RFC's recommended shape. */
export function generateVerifier(): string {
  return base64url(randomBytes(32));
}

export function challengeFor(verifier: string): string {
  return base64url(createHash("sha256").update(verifier, "ascii").digest());
}

/**
 * Verify a code_verifier against the stored challenge.
 *
 * S256 only: `plain` exists in the RFC for constrained clients and defeats the
 * whole point here — an attacker who intercepts the authorization request also
 * has the verifier. Compared in constant time so a wrong verifier leaks nothing
 * through timing.
 */
export function verifyChallenge(
  verifier: string,
  storedChallenge: string,
  method: string = "S256",
): boolean {
  if (method !== "S256") return false;
  if (verifier.length < VERIFIER_MIN_LEN || verifier.length > VERIFIER_MAX_LEN) return false;
  const expected = Buffer.from(challengeFor(verifier));
  const actual = Buffer.from(storedChallenge);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Constant-time `state` comparison — this is the flow's CSRF defence. */
export function verifyState(returned: string, stored: string): boolean {
  if (!returned || !stored) return false;
  const a = Buffer.from(returned);
  const b = Buffer.from(stored);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
