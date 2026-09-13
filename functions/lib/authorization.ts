import { resolveEntitlements } from "./entitlements";

export type Role = "guest" | "user" | "premium";

export type AccessContext = {
  userId: number | null;
  entitlements?: Record<string, boolean>;
};

export async function getAccessContext(db: D1Database, userId: number | null): Promise<AccessContext> {
  if (!userId) return { userId: null };
  return { userId, entitlements: await resolveEntitlements(db, userId) };
}

export function roleFor(ctx: AccessContext): Role {
  if (!ctx.userId) return "guest";
  return Object.values(ctx.entitlements ?? {}).some(Boolean) ? "premium" : "user";
}

export function canUse(ctx: AccessContext, feature: string): boolean {
  if (!ctx.userId) return false;
  if (feature === "account") return true;
  return Boolean(ctx.entitlements?.[feature]);
}

