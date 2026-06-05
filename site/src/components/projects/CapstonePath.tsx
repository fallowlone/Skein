// site/src/components/projects/CapstonePath.tsx
// Guided capstone path: staged milestones with persistent per-milestone completion,
// a progress bar, a self-checklist definition-of-done, and links to the lessons that
// feed each stage. The page normalises legacy {en,ru} milestones into this guided
// shape before passing them in. See docs/.../2026-06-05-guided-capstone-path.md.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { readCapstone, setMilestoneDone, percentDone } from "~/scripts/capstone-state";

type Bi = { en: string; ru: string };
export type GuidedMilestone = {
  id: string;
  title: Bi;
  goal: Bi;
  definitionOfDone: Bi[];
  feedsFrom?: string[];
  reviewPrompt?: Bi;
};

const tt = (lang: Locale, en: string, ru: string) => (lang === "en" ? en : ru);

export default function CapstonePath({ lang, slug, milestones }: { lang: Locale; slug: string; milestones: GuidedMilestone[] }) {
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const done = readCapstone(slug);
  const pct = percentDone(slug, milestones.length);
  const completed = milestones.filter((m) => done[m.id]).length;

  return (
    <section class="my-6">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-mono uppercase tracking-wide text-muted">{tt(lang, "Milestones", "Этапы")}</h2>
        <span class="text-xs font-mono text-muted tabular-nums">{completed}/{milestones.length} · {pct}%</span>
      </div>
      <div class="h-2 bg-card-2 rounded-full overflow-hidden mb-5">
        <div class="h-full bg-ok rounded-full" style={`width:${pct}%`} />
      </div>

      <ol class="flex flex-col gap-4 m-0 p-0 list-none">
        {milestones.map((m, i) => {
          const isDone = !!done[m.id];
          return (
            <li key={m.id} class="rounded-[var(--r-md)] border-[0.5px] border-rule p-5">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span class="font-mono text-[11px] text-muted mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span class="font-medium text-ink">{tt(lang, m.title.en, m.title.ru)}</span>
                </div>
                <button
                  type="button"
                  class={`oa-btn oa-btn-sm shrink-0 ${isDone ? "oa-btn-secondary" : "oa-btn-primary"}`}
                  onClick={() => { setMilestoneDone(slug, m.id, !isDone); bump(); }}
                >
                  {isDone ? tt(lang, "✓ Done", "✓ Готово") : tt(lang, "Mark done", "Отметить готовым")}
                </button>
              </div>

              {(m.goal.en || m.goal.ru) && <p class="text-sm text-ink-2 mt-2">{tt(lang, m.goal.en, m.goal.ru)}</p>}

              {m.definitionOfDone.length > 0 && (
                <div class="mt-3">
                  <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Definition of done", "Критерии готовности")}</div>
                  <ul class="space-y-1">
                    {m.definitionOfDone.map((d, j) => (
                      <li key={j} class="flex items-start gap-2 text-sm">
                        <input type="checkbox" class="mt-1" /> <span>{tt(lang, d.en, d.ru)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.feedsFrom && m.feedsFrom.length > 0 && (
                <div class="mt-3">
                  <div class="text-[10px] font-mono uppercase tracking-wide text-muted mb-1">{tt(lang, "Feeds from", "Опирается на")}</div>
                  <ul class="flex flex-wrap gap-2">
                    {m.feedsFrom.map((key) => (
                      <li key={key}>
                        <a href={`/${lang}/learn/${key}`} class="text-[11px] font-mono px-2 py-0.5 rounded-full border border-rule text-ok no-underline hover:border-ok">
                          {key.split("/").slice(1).join("/")}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.reviewPrompt && (
                <details class="mt-3">
                  <summary class="text-xs text-muted cursor-pointer">{tt(lang, "Self-review", "Самопроверка")}</summary>
                  <p class="text-sm text-ink-2 mt-1">{tt(lang, m.reviewPrompt.en, m.reviewPrompt.ru)}</p>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
