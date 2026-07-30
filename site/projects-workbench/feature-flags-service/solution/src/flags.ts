import { createHash } from "node:crypto";

export type Rule =
  | { kind: "attribute"; attribute: string; anyOf: (string | number | boolean)[]; value: boolean }
  | { kind: "percentage"; percent: number; value: boolean };

export type Flag = {
  key: string;
  enabled: boolean;
  /** Evaluated in order; the first match wins. */
  rules?: Rule[];
  default: boolean;
};

export type User = { id: string; [attr: string]: unknown };

/**
 * Deterministic bucketing.
 *
 * The bucket must depend on BOTH the user id and the flag key: hashing the id
 * alone puts the same unlucky 5% of users in every experiment, which quietly
 * correlates all your rollouts. It must also be stable across processes and
 * restarts, so `Math.random()` and any hash seeded per-process are out — an
 * SDK that re-buckets a user mid-session flips features under their feet.
 */
export function bucketOf(userId: string, flagKey: string): number {
  const digest = createHash("sha256").update(`${flagKey}:${userId}`, "utf8").digest();
  // 32 bits of the digest mapped onto 0..9999 — hundredth-of-a-percent resolution.
  const n = digest.readUInt32BE(0);
  return n % 10_000;
}

/** True when the user falls inside a `percent` rollout (0 ⇒ nobody, 100 ⇒ everybody). */
export function inRollout(userId: string, flagKey: string, percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return bucketOf(userId, flagKey) < Math.round(percent * 100);
}

export function flagOn(flag: Flag, user: User): boolean {
  // A killed flag is off for everyone, whatever the rules say — this is the
  // property that makes a flag an incident lever rather than a config knob.
  if (!flag.enabled) return false;

  for (const rule of flag.rules ?? []) {
    if (rule.kind === "attribute") {
      const actual = user[rule.attribute];
      if (actual !== undefined && rule.anyOf.includes(actual as string | number | boolean)) {
        return rule.value;
      }
    } else if (inRollout(user.id, flag.key, rule.percent)) {
      return rule.value;
    }
  }
  return flag.default;
}

/** ETag over the ruleset — content-addressed, so an unchanged ruleset keeps its tag. */
export function rulesetEtag(flags: Flag[]): string {
  const canonical = JSON.stringify(
    [...flags]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((f) => ({ key: f.key, enabled: f.enabled, rules: f.rules ?? [], default: f.default })),
  );
  return `"${createHash("sha256").update(canonical, "utf8").digest("hex").slice(0, 32)}"`;
}
