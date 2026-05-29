/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  TERMS_VERSION: string;
  COOKIE_NAME?: string; // defaults to "session" in dev, "__Host-session" in prod
}

export interface UserRow {
  id: number;
  github_id: number;
  login: string;
  nickname: string;
  avatar_url: string | null;
  terms_version: string | null;
  terms_accepted_at: number | null;
  created_at: number;
}

/** Data attached by _middleware to the request via context.data */
export interface RequestData extends Record<string, unknown> {
  userId: number | null;
}
