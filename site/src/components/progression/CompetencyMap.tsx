// site/src/components/progression/CompetencyMap.tsx
// Per-domain competency map + the single highest-leverage next step. Computes the
// map on every render from live UserState + a build-time content bundle (the route
// does the content I/O). Honest-but-not-discouraging: never a literal-zero bar,
// confidence pills make "we don't know yet" explicit, leads with one next action.
import { t, type Locale } from "~/i18n";
import { userState } from "~/scripts/user-state";
import { computeCompetencyMap, type RoadmapContent } from "~/scripts/progression/competency-inputs";
import type { DomainConfidence } from "~/scripts/progression/competency";

const BAND_HUE: Record<string, string> = {
  middle: "var(--accent)",
  surface: "var(--d-systems, var(--accent))",
  advanced: "var(--ink)",
  foundations: "var(--muted)",
};

function confLabel(c: DomainConfidence, lang: Locale): string {
  return t(`roadmap.confidence.${c}`, lang);
}

export default function CompetencyMap({ lang, content }: { lang: Locale; content: RoadmapContent }) {
  const state = userState.value; // signal subscription
  const { gaps, topGap, nextUnit } = computeCompetencyMap(state, content, Date.now());
  const coldStart = !state.pretest;

  return (
    <section class="my-8 flex flex-col gap-6">
      <p class="text-sm text-muted">{t("roadmap.subtitle", lang)}</p>

      {coldStart && (
        <div class="bg-card-2 border-l-2 border-accent px-4 py-3 text-sm">
          <p class="text-ink m-0">{t("roadmap.coldStart", lang)}</p>
          <a href={`/${lang}/profile`} class="text-accent underline">{t("roadmap.takePretest", lang)}</a>
        </div>
      )}

      {/* The single next step — biggest senior-weighted gap, prereqs honored. */}
      {topGap && nextUnit && (
        <div class="bg-card border-[0.5px] border-hairline-2 rounded-[var(--r-md)] p-5">
          <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{t("roadmap.next", lang)}</div>
          <a href={`/${lang}/learn/${nextUnit.lessonSlug}`} class="text-ink font-semibold text-lg no-underline hover:underline">
            {nextUnit.unit} →
          </a>
          <p class="text-xs text-muted mt-1">
            {t("roadmap.biggestGap", lang)}: <span class="font-mono">{topGap.track}</span> ({topGap.band})
          </p>
        </div>
      )}

      {/* Per-domain bars, biggest gap first. */}
      <ul class="flex flex-col gap-2.5 m-0 p-0 list-none">
        {gaps.map((g) => (
          <li key={g.track} class="flex items-center gap-3">
            <span class="font-mono text-[12px] text-ink w-44 shrink-0 truncate">{g.track}</span>
            <div class="flex-1 h-2.5 bg-card-2 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full"
                style={`width:${Math.round(g.score * 100)}%;background:${BAND_HUE[g.band] ?? "var(--accent)"};`}
              />
            </div>
            <span class="font-mono text-[10px] text-muted w-10 text-right tabular-nums">{Math.round(g.score * 100)}</span>
            <span class={`text-[10px] font-mono uppercase tracking-wide w-16 text-right ${g.confidence === "none" ? "text-muted" : "text-ink-2"}`}>
              {confLabel(g.confidence, lang)}
            </span>
          </li>
        ))}
      </ul>

      {/* Composes with P2: a "Review due" section will live here later. */}
    </section>
  );
}
