/// <reference types="@cloudflare/workers-types" />

/** Minimal in-memory KV implementing the subset we use. */
export class FakeKV {
  private store = new Map<string, { value: string; exp: number | null }>();

  async get(key: string, type?: "text" | "json"): Promise<any> {
    const e = this.store.get(key);
    if (!e) return null;
    if (e.exp !== null && e.exp <= Date.now()) { this.store.delete(key); return null; }
    return type === "json" ? JSON.parse(e.value) : e.value;
  }
  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const exp = opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : null;
    this.store.set(key, { value, exp });
  }
  async delete(key: string): Promise<void> { this.store.delete(key); }
  /** test helper: force-expire by rewinding */
  _expire(key: string) { const e = this.store.get(key); if (e) e.exp = 1; }
}

/**
 * Tiny D1 fake supporting only the exact statements db.ts issues.
 * Matches on a normalized prefix of the SQL string.
 */
interface FakeUser {
  id: number; github_id: number; login: string; nickname: string;
  avatar_url: string | null; terms_version: string | null;
  terms_accepted_at: number | null; created_at: number;
}
export class FakeD1 {
  users: FakeUser[] = [];
  progress = new Map<number, { data: string; updated_at: number }>();
  entitlements = new Map<string, { active: number; source: string; source_ref: string | null; granted_at: number | null; updated_at: number }>();
  sponsorships = new Map<string, {
    github_sponsor_id: number | null;
    user_id: number | null;
    tier_id: string;
    tier_name: string;
    monthly_price_cents: number;
    is_one_time: number;
    privacy_level: string;
    status: string;
    updated_at: number;
  }>();
  billingDeliveries = new Set<string>();
  billingPayloadHashes = new Set<string>();
  aiUsage = new Map<string, { used: number; updated_at: number }>();
  private seq = 1;

  prepare(sql: string): FakeStmt { return new FakeStmt(this, sql.trim().replace(/\s+/g, " ")); }
  // D1 batch not used; single statements only.
}

class FakeStmt {
  private args: unknown[] = [];
  constructor(private db: FakeD1, private sql: string) {}
  bind(...args: unknown[]): FakeStmt { this.args = args; return this; }

  async first<T = any>(): Promise<T | null> {
    if (this.sql.startsWith("SELECT * FROM users WHERE github_id")) {
      return (this.db.users.find(u => u.github_id === this.args[0]) ?? null) as T | null;
    }
    if (this.sql.startsWith("SELECT * FROM users WHERE id")) {
      return (this.db.users.find(u => u.id === this.args[0]) ?? null) as T | null;
    }
    if (this.sql.startsWith("SELECT data FROM progress WHERE user_id")) {
      const p = this.db.progress.get(this.args[0] as number);
      return (p ? { data: p.data } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT active FROM entitlements WHERE user_id")) {
      const e = this.db.entitlements.get(`${this.args[0]}:${this.args[1]}`);
      return (e ? { active: e.active } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT user_id FROM github_sponsorships WHERE sponsorship_id")) {
      const s = this.db.sponsorships.get(this.args[0] as string);
      return (s ? { user_id: s.user_id } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status FROM github_sponsorships WHERE sponsorship_id")) {
      const id = this.args[0] as string;
      const s = this.db.sponsorships.get(id);
      return (s ? { sponsorship_id: id, ...s } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT sponsorship_id, github_sponsor_id, user_id, tier_id, tier_name, monthly_price_cents, is_one_time, privacy_level, status FROM github_sponsorships WHERE github_sponsor_id")) {
      const sponsorId = this.args[0] as number;
      const rows = Array.from(this.db.sponsorships.entries())
        .filter(([, s]) => s.github_sponsor_id === sponsorId)
        .sort((a, b) => b[1].updated_at - a[1].updated_at);
      const entry = rows[0];
      return (entry ? { sponsorship_id: entry[0], ...entry[1] } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT delivery_id FROM billing_deliveries WHERE delivery_id")) {
      const [id, payloadHash] = this.args as [string, string];
      return (this.db.billingDeliveries.has(id) || this.db.billingPayloadHashes.has(payloadHash) ? { delivery_id: id } : null) as T | null;
    }
    if (this.sql.startsWith("SELECT used FROM ai_usage WHERE user_id")) {
      const e = this.db.aiUsage.get(`${this.args[0]}:${this.args[1]}:${this.args[2]}`);
      return (e ? { used: e.used } : null) as T | null;
    }
    if (this.sql.startsWith("INSERT INTO ai_usage") && this.sql.includes("RETURNING used")) {
      const [userId, feature, period, now, limit] = this.args as [number, string, string, number, number];
      const key = `${userId}:${feature}:${period}`;
      const cur = this.db.aiUsage.get(key);
      if (cur && cur.used >= limit) return null;
      const used = (cur?.used ?? 0) + 1;
      this.db.aiUsage.set(key, { used, updated_at: now });
      return { used } as T;
    }
    // Fail loud: an unrecognized statement means the fake is out of sync with db.ts.
    // Returning null here would mask real bugs as passing tests.
    throw new Error(`FakeD1.first: unmatched SQL: ${this.sql}`);
  }

  async run(): Promise<{ success: true; meta: { last_row_id: number; changes: number } }> {
    if (this.sql.startsWith("INSERT INTO users")) {
      const [github_id, login, nickname, avatar_url, created_at] = this.args as any[];
      const row: FakeUser = {
        id: this.seqNext(), github_id, login, nickname, avatar_url,
        terms_version: null, terms_accepted_at: null, created_at,
      };
      this.db.users.push(row);
      return { success: true, meta: { last_row_id: row.id, changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE users SET login")) {
      const [login, avatar_url, github_id] = this.args as any[];
      const u = this.db.users.find(x => x.github_id === github_id);
      if (u) { u.login = login; u.avatar_url = avatar_url; }
      return { success: true, meta: { last_row_id: 0, changes: u ? 1 : 0 } };
    }
    if (this.sql.startsWith("UPDATE users SET nickname")) {
      const [nickname, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) u.nickname = nickname;
      return { success: true, meta: { last_row_id: 0, changes: u ? 1 : 0 } };
    }
    if (this.sql.startsWith("UPDATE users SET terms_version")) {
      const [terms_version, terms_accepted_at, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) { u.terms_version = terms_version; u.terms_accepted_at = terms_accepted_at; }
      return { success: true, meta: { last_row_id: 0, changes: u ? 1 : 0 } };
    }
    if (this.sql.startsWith("INSERT INTO progress")) {
      const [user_id, data, updated_at] = this.args as any[];
      this.db.progress.set(user_id, { data, updated_at });
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("INSERT INTO entitlements")) {
      const [userId, entitlement, active, source, sourceRef, grantedAt, updatedAt] = this.args as any[];
      const key = `${userId}:${entitlement}`;
      const prev = this.db.entitlements.get(key);
      this.db.entitlements.set(key, {
        active,
        source,
        source_ref: sourceRef,
        granted_at: active === 1 && prev?.active !== 1 ? grantedAt : (prev?.granted_at ?? grantedAt),
        updated_at: updatedAt,
      });
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE entitlements SET active = 0, granted_at = NULL")) {
      const [updatedAt, userId, entitlement, source, sourceRef] = this.args as [number, number, string, string, string];
      const key = `${userId}:${entitlement}`;
      const current = this.db.entitlements.get(key);
      if (!current || current.active !== 1 || current.source !== source || current.source_ref !== sourceRef) {
        return { success: true, meta: { last_row_id: 0, changes: 0 } };
      }
      this.db.entitlements.set(key, { ...current, active: 0, granted_at: null, updated_at: updatedAt });
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("INSERT OR IGNORE INTO billing_deliveries")) {
      const [id, payloadHash] = this.args as [string, string];
      if (this.db.billingDeliveries.has(id) || this.db.billingPayloadHashes.has(payloadHash)) {
        return { success: true, meta: { last_row_id: 0, changes: 0 } };
      }
      this.db.billingDeliveries.add(id);
      this.db.billingPayloadHashes.add(payloadHash);
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("INSERT INTO github_sponsorships")) {
      const [sponsorshipId, githubSponsorId, userId, tierId, tierName, monthlyPriceCents, isOneTime, privacyLevel, status, updatedAt] = this.args as any[];
      this.db.sponsorships.set(sponsorshipId, {
        github_sponsor_id: githubSponsorId,
        user_id: userId,
        tier_id: tierId,
        tier_name: tierName,
        monthly_price_cents: monthlyPriceCents,
        is_one_time: isOneTime,
        privacy_level: privacyLevel,
        status,
        updated_at: updatedAt,
      });
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("UPDATE github_sponsorships SET user_id")) {
      const [userId, sponsorshipId] = this.args as [number, string];
      const s = this.db.sponsorships.get(sponsorshipId);
      if (s) s.user_id = userId;
      return { success: true, meta: { last_row_id: 0, changes: s ? 1 : 0 } };
    }
    if (this.sql.startsWith("UPDATE ai_usage SET used = CASE")) {
      const [now, userId, feature, period] = this.args as [number, number, string, string];
      const key = `${userId}:${feature}:${period}`;
      const cur = this.db.aiUsage.get(key);
      if (cur) this.db.aiUsage.set(key, { used: Math.max(0, cur.used - 1), updated_at: now });
      return { success: true, meta: { last_row_id: 0, changes: cur ? 1 : 0 } };
    }
    if (this.sql.startsWith("DELETE FROM progress WHERE user_id")) {
      this.db.progress.delete(this.args[0] as number);
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("DELETE FROM github_sponsorships WHERE user_id")) {
      const userId = this.args[0] as number;
      for (const [id, s] of this.db.sponsorships) if (s.user_id === userId) this.db.sponsorships.delete(id);
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("DELETE FROM users WHERE id")) {
      const id = this.args[0] as number;
      this.db.users = this.db.users.filter(u => u.id !== id);
      this.db.progress.delete(id);
      return { success: true, meta: { last_row_id: 0, changes: 1 } };
    }
    if (this.sql.startsWith("PRAGMA")) return { success: true, meta: { last_row_id: 0, changes: 0 } };
    // Fail loud on any statement db.ts issues that the fake doesn't model.
    throw new Error(`FakeD1.run: unmatched SQL: ${this.sql}`);
  }
  private seqNext(): number { return (this as any).db["seq"]++; }
}
