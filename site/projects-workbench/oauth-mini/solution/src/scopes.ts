/**
 * Scope enforcement.
 *
 * A token must carry only the scopes the resource owner actually consented to,
 * and a check for `write:billing` must fail on a token granted `read:profile` —
 * otherwise "authorization" is decoration. Requested-but-not-consented scopes are
 * dropped rather than rejected, matching RFC 6749 §3.3 (the granted scope may be
 * narrower than the requested one, and the client is told what it got).
 */
export function grantedScopes(requested: string[], consented: string[]): string[] {
  const allow = new Set(consented);
  return requested.filter((s) => allow.has(s));
}

/** Exact-match check. No prefix logic: `read:profile` must not satisfy `read:profile:email`. */
export function hasScope(granted: string[], required: string): boolean {
  return granted.includes(required);
}

/** Every required scope must be present — an all-of check, not any-of. */
export function hasAllScopes(granted: string[], required: string[]): boolean {
  return required.every((r) => hasScope(granted, r));
}
