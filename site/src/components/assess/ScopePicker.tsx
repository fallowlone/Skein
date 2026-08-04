// site/src/components/assess/ScopePicker.tsx
// First screen of /assess: pick which tracks the audit draws candidates from, or
// "everything". Pure presentational — AssessFlow.tsx owns turning the chosen
// scope into a session (startSession) and into concept candidates (candidatesFor).
//
// I5 (task-12-report.md fix round 1): this used to render the raw track slug
// (e.g. "databases") as the button's visible text, deliberately so it would
// literally match the task-12-brief's e2e regex `/Выбрать тему|databases/i` on
// the RU page. That was the product deformed to fit the test — Ruling 5
// (bilingual or it does not ship) has no exception for the screen's primary
// control. Track titles now come from `~/content/tracks.json` (28 KB, all 44
// tracks — small enough to bundle statically, unlike the 1.1 MB/4.6 MB content
// this screen deliberately fetches instead, see AssessFlow.tsx), and each
// button carries a stable `data-track` attribute so e2e can target it without
// depending on either locale's copy — see e2e/assess.spec.ts.
import { useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import tracksJson from "~/content/tracks.json";

const TRACK_TITLE = new Map((tracksJson as { slug: string; title: { en: string; ru: string } }[]).map((tr) => [tr.slug, tr.title]));
const titleOf = (track: string): { en: string; ru: string } => TRACK_TITLE.get(track) ?? { en: track, ru: track };

type Props = {
  lang: Locale;
  tracks: readonly string[];
  onStart: (scope: string[]) => void;
};

export default function ScopePicker({ lang, tracks, onStart }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [everything, setEverything] = useState(false);

  const toggleTrack = (track: string) => {
    setEverything(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(track)) next.delete(track);
      else next.add(track);
      return next;
    });
  };

  const toggleEverything = () => {
    setEverything((v) => !v);
    setSelected(new Set());
  };

  const canStart = everything || selected.size > 0;
  const start = () => {
    if (!canStart) return;
    onStart(everything ? [...tracks] : [...selected]);
  };

  return (
    <section class="assess-scope">
      <h2 class="as-heading">{t("assess.scope.heading", lang)}</h2>
      <div class="as-tracks" role="group" aria-label={t("assess.scope.heading", lang)}>
        <button
          type="button"
          class={`as-track as-everything ${everything ? "is-selected" : ""}`}
          aria-pressed={everything}
          data-track="*"
          onClick={toggleEverything}
        >
          {t("assess.scope.everything", lang)}
        </button>
        {tracks.map((track) => {
          const title = titleOf(track);
          return (
            <button
              key={track}
              type="button"
              class={`as-track ${selected.has(track) ? "is-selected" : ""}`}
              aria-pressed={selected.has(track)}
              data-track={track}
              onClick={() => toggleTrack(track)}
            >
              {lang === "en" ? title.en : title.ru}
            </button>
          );
        })}
      </div>
      {!canStart && <p class="as-empty-hint">{t("assess.scope.empty", lang)}</p>}
      <button
        type="button"
        class="oa-btn oa-btn-primary"
        disabled={!canStart}
        aria-disabled={!canStart}
        onClick={start}
      >
        {t("assess.scope.start", lang)}
      </button>
    </section>
  );
}
