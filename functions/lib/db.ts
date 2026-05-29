/// <reference types="@cloudflare/workers-types" />
import type { UserRow } from "./types";

export interface GithubUser { id: number; login: string; avatar_url: string | null; }

export async function getUserById(db: D1Database, id: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
}

async function getUserByGithubId(db: D1Database, githubId: number): Promise<UserRow | null> {
  return await db.prepare("SELECT * FROM users WHERE github_id = ?").bind(githubId).first<UserRow>();
}

/** Insert on first sign-in (nickname defaults to login); else refresh login+avatar, keep nickname. */
export async function upsertUserFromGithub(db: D1Database, gh: GithubUser): Promise<UserRow> {
  const existing = await getUserByGithubId(db, gh.id);
  if (!existing) {
    const now = Date.now();
    const res = await db
      .prepare("INSERT INTO users (github_id, login, nickname, avatar_url, created_at) VALUES (?, ?, ?, ?, ?)")
      .bind(gh.id, gh.login, gh.login, gh.avatar_url, now)
      .run();
    const id = res.meta.last_row_id;
    return (await getUserById(db, id))!;
  }
  await db
    .prepare("UPDATE users SET login = ?, avatar_url = ? WHERE github_id = ?")
    .bind(gh.login, gh.avatar_url, gh.id)
    .run();
  return (await getUserByGithubId(db, gh.id))!;
}

export async function setNickname(db: D1Database, id: number, nickname: string): Promise<void> {
  await db.prepare("UPDATE users SET nickname = ? WHERE id = ?").bind(nickname, id).run();
}

export async function acceptTerms(db: D1Database, id: number, version: string, at: number): Promise<void> {
  await db.prepare("UPDATE users SET terms_version = ?, terms_accepted_at = ? WHERE id = ?")
    .bind(version, at, id).run();
}

export async function deleteUser(db: D1Database, id: number): Promise<void> {
  // explicit progress delete in addition to ON DELETE CASCADE (defensive)
  await db.prepare("DELETE FROM progress WHERE user_id = ?").bind(id).run();
  await db.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
}

export async function getProgress(db: D1Database, userId: number): Promise<string | null> {
  const row = await db.prepare("SELECT data FROM progress WHERE user_id = ?").bind(userId).first<{ data: string }>();
  return row?.data ?? null;
}

export async function putProgress(db: D1Database, userId: number, data: string, updatedAt: number): Promise<void> {
  await db.prepare(
    "INSERT INTO progress (user_id, data, updated_at) VALUES (?, ?, ?) " +
    "ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
  ).bind(userId, data, updatedAt).run();
}

const NICK_RE = /^[\p{L}\p{N} _.\-]{2,32}$/u;
export function validateNickname(raw: string): { ok: boolean; value: string } {
  const value = (raw ?? "").trim();
  return { ok: NICK_RE.test(value), value };
}
