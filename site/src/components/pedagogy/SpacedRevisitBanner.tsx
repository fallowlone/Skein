import { userState, dismissRevisit } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";

type Props = { lang: Locale };

const DAY = 86_400_000;

export default function SpacedRevisitBanner({ lang }: Props) {
  const s = userState.value;
  const entries = Object.entries(s.history);
  if (entries.length === 0) return null;

  const due = entries.find(([slug, h]) => {
    const since = Date.now() - h.lastAt;
    const ret = s.retrieval[slug];
    const retrievalDue = !ret?.attempted || Date.now() - (ret?.lastAt ?? 0) > 7 * DAY;
    const dismissed = s.dismissedRevisit[slug] ?? 0;
    const dismissedRecent = Date.now() - dismissed < 1 * DAY;
    return since > 1 * DAY && retrievalDue && !dismissedRecent;
  });
  if (!due) return null;
  const [slug] = due;

  return (
    <div class="bg-panel-peach border-b-2 border-panel-peach-ink/40 px-6 py-2 text-sm flex items-center gap-3">
      <strong class="text-panel-peach-ink">{t("revisit.title", lang)}</strong>
      <a class="underline font-semibold text-bbg-ink" href={`?revisit=${slug}#retrieval`}>
        {t("revisit.cta", lang)}
      </a>
      <span class="font-mono text-xs text-bbg-muted">{slug}</span>
      <button
        type="button"
        class="ml-auto text-xs text-bbg-muted underline"
        onClick={() => dismissRevisit(slug)}
      >
        {t("revisit.dismiss", lang)}
      </button>
    </div>
  );
}
