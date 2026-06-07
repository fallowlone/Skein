// src/components/progression/MissionsList.tsx
// Missions in progress — honest goals derived from real signals (deriveMissions over the
// per-domain gaps + live streak). No fabricated rating rewards or daily-login economy.
// The parent (ProfilePanel) computes the missions once via computeMissions() and passes
// them in, so the gate and the list never diverge and the signals aren't read twice.
import type { Locale } from "~/i18n";
import { knowledge, config, content } from "~/scripts/path/path-io";
import { userState } from "~/scripts/user-state";
import { domainRatings } from "~/scripts/progression/domain-ratings";
import { deriveMissions, type Mission } from "~/scripts/progression/missions";

const L = {
  en: { reward: "Reward" },
  ru: { reward: "Награда" },
} as const;

// Reads the live signals (knowledge/config/userState) — call it inside a component render
// so the caller subscribes. Returns the honest derived missions (may be empty).
export function computeMissions(): Mission[] {
  const domains = domainRatings(knowledge.value, content.concepts, config.value.weights.masteryThreshold);
  return deriveMissions({ domains, streakCount: userState.value.progression.streak.count });
}

export default function MissionsList({ lang, missions }: { lang: Locale; missions: Mission[] }) {
  const t = L[lang];
  if (missions.length === 0) return null;

  return (
    <div class="missions">
      {missions.map((m) => {
        const pct = m.total > 0 ? Math.round((m.done / m.total) * 100) : 0;
        return (
          <div key={m.id} class="mission">
            <div class="m-head">
              <span class="m-name">{m.title[lang]}</span>
              <span class="m-prog">{m.done} / {m.total}</span>
            </div>
            <div class="progress"><div style={`width:${pct}%`} /></div>
            <div class="m-reward">{t.reward} <b>{m.rewardLabel[lang]}</b></div>
          </div>
        );
      })}
    </div>
  );
}
