import { getEntitlement } from "./db";

export async function resolveEntitlements(db: D1Database, userId: number): Promise<Record<string, boolean>> {
  return {
    coach: await getEntitlement(db, userId, "coach"),
    readiness_pro: await getEntitlement(db, userId, "readiness_pro"),
    expedition: await getEntitlement(db, userId, "expedition"),
  };
}
