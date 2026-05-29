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
    return null;
  }

  async run(): Promise<{ success: true; meta: { last_row_id: number } }> {
    if (this.sql.startsWith("INSERT INTO users")) {
      const [github_id, login, nickname, avatar_url, created_at] = this.args as any[];
      const row: FakeUser = {
        id: this.seqNext(), github_id, login, nickname, avatar_url,
        terms_version: null, terms_accepted_at: null, created_at,
      };
      this.db.users.push(row);
      return { success: true, meta: { last_row_id: row.id } };
    }
    if (this.sql.startsWith("UPDATE users SET login")) {
      const [login, avatar_url, github_id] = this.args as any[];
      const u = this.db.users.find(x => x.github_id === github_id);
      if (u) { u.login = login; u.avatar_url = avatar_url; }
    }
    if (this.sql.startsWith("UPDATE users SET nickname")) {
      const [nickname, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) u.nickname = nickname;
    }
    if (this.sql.startsWith("UPDATE users SET terms_version")) {
      const [terms_version, terms_accepted_at, id] = this.args as any[];
      const u = this.db.users.find(x => x.id === id);
      if (u) { u.terms_version = terms_version; u.terms_accepted_at = terms_accepted_at; }
    }
    if (this.sql.startsWith("INSERT INTO progress")) {
      const [user_id, data, updated_at] = this.args as any[];
      this.db.progress.set(user_id, { data, updated_at });
    }
    if (this.sql.startsWith("DELETE FROM progress WHERE user_id")) {
      this.db.progress.delete(this.args[0] as number);
    }
    if (this.sql.startsWith("DELETE FROM users WHERE id")) {
      const id = this.args[0] as number;
      this.db.users = this.db.users.filter(u => u.id !== id);
      this.db.progress.delete(id);
    }
    if (this.sql.startsWith("PRAGMA")) { /* no-op */ }
    return { success: true, meta: { last_row_id: 0 } };
  }
  private seqNext(): number { return (this as any).db["seq"]++; }
}
