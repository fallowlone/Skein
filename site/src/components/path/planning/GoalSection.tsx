// src/components/path/planning/GoalSection.tsx
// 01 · GOAL — preset goals as toggle cards with a clear rank (1 = most important; rank 1 gets
// the most time), a derived plan-time split bar, and a live rank panel under each active card.
// A collapsible "refine" block holds custom concept targets + excluded tracks
// (formerly the GoalPicker modal — now inline, single source).
// Premium re-skin per the Learnvane "Goal Configurator" design: every derived value
// (rank, %, meta counts, split segments) is recomputed from state, never stored.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Goal, Track } from "~/scripts/path/types";
import {
  config, content, setGoals, toggleCustomTarget, toggleExcludedTrack, searchConcepts,
} from "~/scripts/path/path-io";
import { normalizeRanks, goalWeightFactor } from "~/scripts/path/goal-rank";
import { COLD_START_GOAL_ID } from "~/scripts/path/config";
import { hueForTrack } from "./domain-hue";

const L = {
  en: {
    tracks: (n: number) => `${n} track${n === 1 ? "" : "s"}`,
    concepts: (n: number) => `${n} concept${n === 1 ? "" : "s"}`,
    rankSym: "#", ofPlan: "of plan",
    refine: "Refine / custom goals", hide: "Hide",
    targets: "Custom goals",
    targetsHint: "Build a goal from individual concepts. Search, then add — the plan folds them in alongside your tracks.",
    search: "Find concepts for a goal…",
    noMatch: "No concepts match", noChips: "No custom concepts yet — search above to add.",
    exclude: "Excluded tracks",
    excludeHint: "Already know it, or just don't want it? Click a track to keep it out of every plan.",
    up: "Raise priority", down: "Lower priority",
    recommended: "Recommended", // mirrors ui.json path.goal.recommended (path islands carry their own L map)
    splitLabel: "Plan-time split",
    activeN: (n: number) => `${n} active`,
    splitEmpty: "No active goals — pick one to shape the plan.",
    excludedN: (n: number) => `${n} excluded`, excludedNone: "none excluded",
    remove: (name: string) => `Remove ${name}`,
  },
  ru: {
    tracks: (n: number) => `${n} трек${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    concepts: (n: number) => `${n} концепт${n === 1 ? "" : n < 5 ? "а" : "ов"}`,
    rankSym: "№", ofPlan: "плана",
    refine: "Уточнить / свои цели", hide: "Свернуть",
    targets: "Свои цели",
    targetsHint: "Соберите цель из отдельных концептов. Найдите и добавьте — план учтёт их вместе с треками.",
    search: "Найти концепты для цели…",
    noMatch: "Ничего не найдено", noChips: "Пока нет своих концептов — добавьте через поиск.",
    exclude: "Исключённые треки",
    excludeHint: "Уже знаете или не хотите? Нажмите на трек, чтобы убрать его из всех планов.",
    up: "Повысить приоритет", down: "Понизить приоритет",
    recommended: "Рекомендуем", // mirrors ui.json path.goal.recommended (path islands carry their own L map)
    splitLabel: "Доля времени плана",
    activeN: (n: number) => `активно ${n}`,
    splitEmpty: "Нет активных целей — выберите одну, чтобы задать план.",
    excludedN: (n: number) => `исключено ${n}`, excludedNone: "ничего не исключено",
    remove: (name: string) => `Убрать ${name}`,
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

// A goal's hue = the domain hue of its most heavily weighted track. Concept-only
// goals (no trackWeights) fall back to the neutral accent so the split stays legible.
function hueForGoal(g: Goal): string {
  const weights = Object.entries(g.trackWeights ?? {}) as [Track, number][];
  if (weights.length === 0) return "--accent";
  const dominant = weights.reduce((best, cur) => (cur[1] > best[1] ? cur : best));
  return hueForTrack(dominant[0]);
}

// Segment / swatch fill: the goal hue softened toward the card by a rank-indexed ramp,
// so rank 1 reads strongest and lower ranks recede. Mirrors the design's opacity ramp.
const FILL_RAMP = [1, 0.74, 0.54, 0.4, 0.32, 0.26];
function segFill(g: Goal, i: number): string {
  const pct = Math.round((FILL_RAMP[i] ?? 0.24) * 100);
  return `color-mix(in srgb, var(${hueForGoal(g)}) ${pct}%, var(--card))`;
}

export default function GoalSection({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const active = cfg.goals;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(-1);

  const ranked = normalizeRanks(active);
  const n = ranked.length;
  const rankOf = (id: string) => ranked.find((r) => r.id === id)?.rank ?? null;
  // Time-share: a goal's weight factor over the sum of all active factors.
  const factorSum = ranked.reduce((s, r) => s + goalWeightFactor(r.rank, n), 0) || 1;
  const shareOf = (rank: number) => Math.round((goalWeightFactor(rank, n) / factorSum) * 100);

  const goalById = (id: string) => content.goals.find((g) => g.id === id);
  // Active goals in rank order, with derived share — drives the split bar + legend.
  const ordered = ranked
    .map((r) => ({ goal: goalById(r.id), rank: r.rank, share: shareOf(r.rank) }))
    .filter((x): x is { goal: Goal; rank: number; share: number } => x.goal != null);

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
  const results = searchConcepts(content.concepts, content.taughtConcepts, q, lang, 20)
    .filter((c) => !custom.includes(c.id));
  const tracks = [...new Set(content.concepts.map((c) => c.track))].sort();

  const addResult = (id: string) => { toggleCustomTarget(id); setQ(""); setCursor(-1); };
  const onSearchKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" && results.length) { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp" && results.length) { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { const pick = results[cursor] ?? results[0]; if (pick) { e.preventDefault(); addResult(pick.id); } }
    else if (e.key === "Escape") { setQ(""); setCursor(-1); }
  };

  return (
    <div class="goal-config">
      {/* ── plan-time split (derived from active goals) ── */}
      <div class="plan-split" aria-live="polite">
        <div class="ps-top">
          <span class="ps-label">{t.splitLabel}</span>
          <span class="ps-count">{n ? t.activeN(n) : ""}</span>
        </div>
        <div class={`ps-bar${n ? "" : " is-empty"}`}>
          {ordered.map((x, i) => (
            <span
              key={x.goal.id}
              class="ps-seg"
              style={{ width: `${x.share}%`, background: segFill(x.goal, i) }}
              title={`${x.goal.label[lang]} — ${x.share}%`}
            />
          ))}
        </div>
        {n ? (
          <div class="ps-legend">
            {ordered.map((x, i) => (
              <span key={x.goal.id} class="ps-leg">
                <span class="sw" style={{ background: segFill(x.goal, i) }} />
                <span class="rk">#{x.rank}</span> {x.goal.label[lang]}{" "}
                <span class="pct">{x.share}%</span>
              </span>
            ))}
          </div>
        ) : (
          <p class="ps-empty">{t.splitEmpty}</p>
        )}
      </div>

      {/* ── goals grid ── */}
      <div class="goals-grid">
        {content.goals.map((g) => {
          const rank = rankOf(g.id);
          const on = rank !== null;
          const recommended = g.id === COLD_START_GOAL_ID;
          return (
            <div key={g.id} class={`goal-cell${on ? " is-active" : ""}`}>
              <button type="button" class="goal-card" aria-pressed={on} aria-label={g.label[lang]} onClick={() => toggle(g.id)}>
                {on && <span class="gc-prio" title={`priority ${rank}`}>{rank}</span>}
                <span class="gc-title-row">
                  <span class="gc-name">{g.label[lang]}</span>
                  {recommended && <span class="gc-rec">{t.recommended}</span>}
                </span>
                <span class="gc-meta">{goalMeta(lang, g)}</span>
              </button>
              {on && (
                <div class="rank-panel">
                  <span class="rp-share">{t.rankSym}{rank} · <b>~{shareOf(rank!)}%</b> {t.ofPlan}</span>
                  <span class="rp-ctrl">
                    <button type="button" class="rp-btn" aria-label={t.up} disabled={rank === 1} onClick={() => move(g.id, "up")}>↑</button>
                    <button type="button" class="rp-btn" aria-label={t.down} disabled={rank === n} onClick={() => move(g.id, "down")}>↓</button>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── refine / custom goals ── */}
      <div class="refine">
        <button type="button" class="refine-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <span class="rt-label">{open ? t.hide : t.refine}</span>
          <span class="rt-icon" aria-hidden="true">⌄</span>
        </button>

        {open && (
          <div class="refine-panel">
            <div class="refine-col">
              <div class="rc-head"><h3>{t.targets}</h3><p class="rc-hint">{t.targetsHint}</p></div>
              <div class="cg-field">
                <div class="cmdk cg-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
                  <input
                    type="text" autocomplete="off" aria-label={t.search} placeholder={t.search}
                    value={q}
                    onInput={(e) => { setQ((e.target as HTMLInputElement).value); setCursor(-1); }}
                    onKeyDown={onSearchKey}
                  />
                  <span class="cg-kbd">↑↓ ⏎</span>
                </div>
                {q.trim() && (
                  <div class="cg-results" role="listbox">
                    {results.length === 0 ? (
                      <div class="cg-empty">{t.noMatch} “{q.trim()}”</div>
                    ) : (
                      results.map((c, i) => (
                        <button
                          key={c.id} type="button"
                          class={`cg-result${i === cursor ? " is-cursor" : ""}`}
                          onMouseEnter={() => setCursor(i)}
                          onClick={() => addResult(c.id)}
                        >
                          <span class="cr-name">{c.label[lang]}</span>
                          <span class="cr-dom">{c.track}</span>
                          <span class="cr-add" aria-hidden="true">＋</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div class="cg-chips">
                {custom.length === 0 ? (
                  <span class="cg-empty-chips">{t.noChips}</span>
                ) : (
                  custom.map((id) => {
                    const name = content.conceptById.get(id)?.label[lang] ?? id;
                    return (
                      <span key={id} class="cg-chip">
                        {name}
                        <button type="button" class="cc-x" aria-label={t.remove(name)} onClick={() => toggleCustomTarget(id)}>×</button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>

            <div class="refine-col">
              <div class="rc-head"><h3>{t.exclude}</h3><p class="rc-hint">{t.excludeHint}</p></div>
              <div class="track-grid">
                {tracks.map((tr) => {
                  const off = cfg.excludedTracks.includes(tr);
                  return (
                    <button key={tr} type="button" class="track-chip" aria-pressed={off} onClick={() => toggleExcludedTrack(tr)}>{tr}</button>
                  );
                })}
              </div>
              <p class="track-foot">
                {cfg.excludedTracks.length === 0
                  ? t.excludedNone
                  : <>{t.excludedN(cfg.excludedTracks.length)}: <b>{cfg.excludedTracks.join(", ")}</b></>}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
