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
    <section class="cap">
      <div class="cap-head">
        <h2 class="cap-title">{tt(lang, "Milestones", "Этапы")}</h2>
        <span class="cap-count">{completed}/{milestones.length} · {pct}%</span>
      </div>
      <div class="cap-progress"><i style={`width:${pct}%`} /></div>

      <ol class="cap-list">
        {milestones.map((m, i) => {
          const isDone = !!done[m.id];
          return (
            <li key={m.id} class={`cap-item${isDone ? " is-done" : ""}`}>
              <div class="cap-mhead">
                <div>
                  <span class="cap-no">{String(i + 1).padStart(2, "0")}</span>
                  <span class="cap-mtitle">{tt(lang, m.title.en, m.title.ru)}</span>
                </div>
                <button
                  type="button"
                  class={`oa-btn oa-btn-sm ${isDone ? "oa-btn-secondary" : "oa-btn-primary"}`}
                  onClick={() => { setMilestoneDone(slug, m.id, !isDone); bump(); }}
                >
                  {isDone ? tt(lang, "✓ Done", "✓ Готово") : tt(lang, "Mark done", "Отметить готовым")}
                </button>
              </div>

              {(m.goal.en || m.goal.ru) && <p class="cap-goal">{tt(lang, m.goal.en, m.goal.ru)}</p>}

              {m.definitionOfDone.length > 0 && (
                <div class="cap-dod">
                  <div class="cap-dod-label">{tt(lang, "Definition of done", "Критерии готовности")}</div>
                  <ul class="cap-dod-list">
                    {m.definitionOfDone.map((d, j) => (
                      <li key={j}>
                        <input type="checkbox" /> <span>{tt(lang, d.en, d.ru)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.feedsFrom && m.feedsFrom.length > 0 && (
                <div class="cap-feeds">
                  <div class="cap-feeds-label">{tt(lang, "Feeds from", "Опирается на")}</div>
                  <ul class="cap-feeds-list">
                    {m.feedsFrom.map((key) => (
                      <li key={key}>
                        <a href={`/${lang}/learn/${key}`} class="cap-feed">
                          {key.split("/").slice(1).join("/")}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.reviewPrompt && (
                <details class="cap-review">
                  <summary>{tt(lang, "Self-review", "Самопроверка")}</summary>
                  <p>{tt(lang, m.reviewPrompt.en, m.reviewPrompt.ru)}</p>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
