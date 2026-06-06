// Canonical global XP: the single source both /profile and /roadmap read, so the displayed
// level is identical. Assembles user-state + drills + english + the derived path-step bonus.
import { userState } from "~/scripts/user-state";
import { loadStore } from "~/components/algo/drill-state";
import { englishKnownTotal } from "~/english/state";
import { xpFromState } from "./xp";
import { pathStepBonusXp } from "./path-xp";
import { knowledge, content, config } from "~/scripts/path/path-io";

export function currentXp(): number {
  const drillsSolved = Object.values(loadStore()).filter((e: any) => e?.status === "solved").length;
  const bonus = pathStepBonusXp(knowledge.value, content.units, config.value.weights.masteryThreshold);
  return xpFromState(userState.value, drillsSolved, englishKnownTotal(), bonus);
}
