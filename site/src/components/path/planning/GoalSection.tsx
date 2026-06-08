// src/components/path/planning/GoalSection.tsx
// 01 · GOAL — preset goals as toggle cards with a clear rank (1 = most important; rank 1 gets
// the most time) and a live time-share explainer. A collapsible "refine" block holds custom
// concept targets + excluded tracks (formerly the GoalPicker modal — now inline, single source).
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Goal } from "~/scripts/path/types";
import {
  config, content, setGoals, toggleCustomTarget, toggleExcludedTrack, searchConcepts,
} from "~/scripts/path/path-io";
import { normalizeRanks, goalWeightFactor } from "~/scripts/path/goal-rank";

const L = {
  en: {
    tracks: (n: number) => `${n} track${n === 1 ? "" : "s"}`,
    concepts: (n: number) => `${n} concept${n === 1 ? "" : "s"}`,
    rankNote: (rank: number, pct: number) => `#${rank} · ~${pct}% of plan time`,
    refine: "Refine / custom targets", hide: "Hide",
    targets: "Custom targets", search: "Search concepts to target…",
    exclude: "Excluded tracks", up: "more important", down: "less important",
  },
  ru: {
    tracks: (n: number) => `${n} трек${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    concepts: (n: number) => `${n} концепт${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    rankNote: (rank: number, pct: number) => `№${rank} · ~${pct}% времени плана`,
    refine: "Уточнить / свои цели", hide: "Скрыть",
    targets: "Свои цели", search: "Найти концепты для цели…",
    exclude: "Исключённые треки", up: "важнее", down: "менее важно",
  },
} as const;

function goalMeta(lang: Locale, g: Goal): string {
  const t = L[lang];
  const trackN = Object.keys(g.trackWeights ?? {}).length;
  const conceptN = g.target?.concepts?.length ?? 0;
  const parts: string[] = [];
  if (trackN > 0) parts.push(t.tracks(trackN));
  if (conceptN > 0) parts.push(t.concepts(conceptN));
  return parts.join(" · ");
}

export default function GoalSection({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const active = cfg.goals;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const ranked = normalizeRanks(active);
  const n = ranked.length;
  const rankOf = (id: string) => ranked.find((r) => r.id === id)?.rank ?? null;
  // Time-share: a goal's weight factor over the sum of all active factors.
  const factorSum = ranked.reduce((s, r) => s + goalWeightFactor(r.rank, n), 0) || 1;
  const shareOf = (rank: number) => Math.round((goalWeightFactor(rank, n) / factorSum) * 100);

  // Toggle on → append at the next (least-important) rank, encoded as priority = max+1.
  const toggle = (id: string) => {
    if (active.some((g) => g.id === id)) {
      setGoals(active.filter((g) => g.id !== id));
    } else {
      const nextPrio = active.length ? Math.max(...active.map((g) => g.priority)) + 1 : 1;
      setGoals([...active, { id, priority: nextPrio }]);
    }
  };

  // Reorder: rewrite priorities to the new rank order so normalizeRanks stays consistent.
  const move = (id: string, dir: "up" | "down") => {
    const order = [...ranked].map((r) => r.id);
    const i = order.indexOf(id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setGoals(order.map((gid, idx) => ({ id: gid, priority: idx + 1 })));
  };

  const custom = cfg.customTargets ?? [];
  const results = searchConcepts(content.concepts, content.taughtConcepts, q, lang, 20).filter((c) => !custom.includes(c.id));
  const tracks = [...new Set(content.concepts.map((c) => c.track))].sort();

  return (
    <div>
      <div class="goals">
        {content.goals.map((g) => {
          const rank = rankOf(g.id);
          const on = rank !== null;
          return (
            <div key={g.id} class={`goal-wrap${on ? " on" : ""}`}>
              <button type="button" class="goal" aria-pressed={on} onClick={() => toggle(g.id)}>
                {on && <span class="g-prio">{rank}</span>}
                <span class="g-name">{g.label[lang]}</span>
                <span class="g-meta">{goalMeta(lang, g)}</span>
              </button>
              {on && (
                <div class="g-rank">
                  <span class="g-share">{t.rankNote(rank!, shareOf(rank!))}</span>
                  <span class="g-arrows">
                    <button type="button" aria-label={t.up} disabled={rank === 1} onClick={() => move(g.id, "up")}>↑</button>
                    <button type="button" aria-label={t.down} disabled={rank === n} onClick={() => move(g.id, "down")}>↓</button>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button type="button" class="goal-refine-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? t.hide : t.refine}
      </button>

      {open && (
        <div class="goal-refine">
          <h3>{t.targets}</h3>
          <div class="chips">
            {custom.map((id) => (
              <button key={id} class="chip on" onClick={() => toggleCustomTarget(id)}>
                {content.conceptById.get(id)?.label[lang] ?? id} ✕
              </button>
            ))}
          </div>
          <input class="refine-search" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} placeholder={t.search} />
          {results.length > 0 && (
            <ul class="refine-results">
              {results.map((c) => (
                <li key={c.id}>
                  <button onClick={() => { toggleCustomTarget(c.id); setQ(""); }}>
                    <span>{c.label[lang]}</span><span class="r-track">{c.track}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3>{t.exclude}</h3>
          <div class="chips">
            {tracks.map((tr) => {
              const offTrack = cfg.excludedTracks.includes(tr);
              return <button key={tr} class={`chip${offTrack ? " excluded" : ""}`} onClick={() => toggleExcludedTrack(tr)}>{tr}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
