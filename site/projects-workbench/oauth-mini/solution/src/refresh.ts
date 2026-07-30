export type RotateResult =
  | { ok: true; next: string }
  | { ok: false; error: "invalid_grant"; reuseDetected: boolean };

/**
 * Refresh-token rotation with reuse detection.
 *
 * Every refresh consumes the presented token and issues a new one, so a refresh
 * token is single-use. The security payoff is what happens on a *second* use of
 * an already-rotated token: either the legitimate client replayed it or an
 * attacker stole it, and you cannot tell which — so the whole token family is
 * revoked, forcing re-authentication. Silently issuing a new token instead would
 * let a thief ride along indefinitely.
 */
export class RefreshStore {
  /** token → family id; absent means unknown or already consumed. */
  private active = new Map<string, string>();
  /** tokens seen and consumed, kept to distinguish reuse from garbage input. */
  private consumed = new Map<string, string>();
  private revokedFamilies = new Set<string>();

  issue(token: string, familyId: string): void {
    this.active.set(token, familyId);
  }

  rotate(presented: string, next: string): RotateResult {
    const family = this.active.get(presented);

    if (family === undefined) {
      const consumedFamily = this.consumed.get(presented);
      if (consumedFamily !== undefined) {
        // Reuse of a consumed token: revoke the family, not just this token.
        this.revokeFamily(consumedFamily);
        return { ok: false, error: "invalid_grant", reuseDetected: true };
      }
      return { ok: false, error: "invalid_grant", reuseDetected: false };
    }

    if (this.revokedFamilies.has(family)) {
      return { ok: false, error: "invalid_grant", reuseDetected: true };
    }

    this.active.delete(presented);
    this.consumed.set(presented, family);
    this.active.set(next, family);
    return { ok: true, next };
  }

  revokeFamily(familyId: string): void {
    this.revokedFamilies.add(familyId);
    for (const [token, family] of this.active) {
      if (family === familyId) this.active.delete(token);
    }
  }

  isActive(token: string): boolean {
    const family = this.active.get(token);
    return family !== undefined && !this.revokedFamilies.has(family);
  }
}
