// site/src/components/assess/ScopePicker.tsx
// First screen of /assess: pick which tracks the audit draws candidates from, or
// "everything". Pure presentational — AssessFlow.tsx owns turning the chosen
// scope into a session (startSession) and into concept candidates (candidatesFor).
import { useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";

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
          onClick={toggleEverything}
        >
          {t("assess.scope.everything", lang)}
        </button>
        {tracks.map((track) => (
          <button
            key={track}
            type="button"
            class={`as-track ${selected.has(track) ? "is-selected" : ""}`}
            aria-pressed={selected.has(track)}
            onClick={() => toggleTrack(track)}
          >
            {track}
          </button>
        ))}
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
