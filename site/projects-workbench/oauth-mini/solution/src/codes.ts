import { verifyChallenge } from "./pkce";

export type CodeGrant = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string[];
  expiresAt: number;
};

export type ExchangeInput = {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier: string;
  now: number;
};

export type ExchangeResult =
  | { ok: true; scope: string[] }
  | { ok: false; error: "invalid_grant" | "invalid_request" };

/**
 * The authorization-code store.
 *
 * An authorization code is a one-time bearer of intent, so the store — not the
 * caller — owns single use: `exchange` consumes the code before validating
 * anything else, which is what makes a replay fail even when the replay carries
 * the correct verifier. Codes are also bound to the client and the exact
 * redirect_uri they were issued for, so a code stolen from one client cannot be
 * redeemed by another or redirected somewhere else.
 */
export class AuthCodeStore {
  private codes = new Map<string, CodeGrant>();

  issue(code: string, grant: CodeGrant): void {
    this.codes.set(code, grant);
  }

  exchange(input: ExchangeInput): ExchangeResult {
    const grant = this.codes.get(input.code);
    // Consume first: a replayed code must fail even if everything else matches.
    this.codes.delete(input.code);

    if (!grant) return { ok: false, error: "invalid_grant" };
    if (grant.expiresAt <= input.now) return { ok: false, error: "invalid_grant" };
    if (grant.clientId !== input.clientId) return { ok: false, error: "invalid_grant" };
    if (grant.redirectUri !== input.redirectUri) return { ok: false, error: "invalid_grant" };
    if (grant.codeChallengeMethod !== "S256") return { ok: false, error: "invalid_request" };
    if (!verifyChallenge(input.codeVerifier, grant.codeChallenge, grant.codeChallengeMethod)) {
      return { ok: false, error: "invalid_grant" };
    }
    return { ok: true, scope: grant.scope };
  }

  get size(): number {
    return this.codes.size;
  }
}
