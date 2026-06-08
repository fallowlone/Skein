// src/components/path/planning/DeadlineSection.tsx
// Signature instrument #2 — deadline / exam-prep mode. Config (date, weekday-hours
// grid, blackout dates, reading-depth) writes a full DeadlineConfig via setDeadline.
// Output (verdict + budget bar + dated schedule) is derived from the real Schedule
// returned by computePath() and the scheduleBudget read-model. No mock arrays.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { DeadlineConfig, Schedule, Tier } from "~/scripts/path/types";
import { config, content, computePath, setDeadline, setKnob, currentPace, currentFixes, applyFix, applyCombo } from "~/scripts/path/path-io";
import { scheduleBudget } from "~/scripts/path/schedule-budget";
import HoursPicker, { fmtH } from "./HoursPicker";
import type { Fix } from "~/scripts/path/optimize";

const TIERS: Tier[] = ["junior", "middle", "senior"];

const L = {
  en: {
    target: "Target date",
    hours: "Hours per weekday — adjust a column, 0 = day off",
    weekTotal: (h: number, off: number) => `${fmtH(h)} h available per week · ${off} day(s) off`,
    blackouts: "Blackout dates", add: "+ add", addLabel: "Add blackout date", remove: "remove",
    depth: "Reading depth", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    junior: "junior", middle: "middle", senior: "senior",
    onTrack: "On track", over: "Over budget", under: "Ahead",
    daysLeft: "days left", have: "have", need: (h: number) => `need ${fmtH(h)}h`,
    schedHead: "Dated schedule · first days",
    honestFits: (slack: number) => `Comfortably feasible — about ${fmtH(slack)} h of slack to the date with this availability.`,
    honestUnder: (slack: number) => `Ahead of plan — roughly ${fmtH(slack)} h of slack; you could deepen or pull work forward.`,
    honestOver: (deficit: number) => `Behind by about ${fmtH(deficit)} h.`,
    dropTail: (titles: string) => ` Won't fit by the date: ${titles}. Raise weekday hours or move the date to close the gap.`,
    overTail: " Raise weekday hours or move the date to close the gap.",
    today: "today", dayOff: "Day off", blackout: "Blackout — no study", review: "Review & spaced cards",
    empty: "Set a target date to get an honest, dated schedule from your real weekday availability.",
    aria: (d: string) => `${d} hours`,
    sig: "Signature. Set a date and your real weekday hours; the engine returns a dated plan and an honest verdict — including what gets dropped when the budget doesn't fit.",
    hoursUnit: "h",
    paceHead: "Pace",
    paceDone: (done: number, total: number) => `Done ${done} of ${total} h`,
    paceBehind: (days: number) => `~${days} day(s) behind at your current pace`,
    paceAhead: "Ahead of your planned pace",
    paceOnTrack: "On your planned pace",
    paceFinish: (d: string) => `projected finish ${d}`,
    fixHead: "How to make it fit",
    fixRaise: (h: number, save: number) => `+${fmtH(h)} h on each weekday — frees ${Math.round(save / 60)} h`,
    fixExtend: (d: number, save: number) => `Move the date +${d} days — frees ${Math.round(save / 60)} h`,
    fixDepth: (tier: string, save: number) => `Read at ${tier} depth — saves ${Math.round(save / 60)} h`,
    fixDrop: (label: string, save: number) => `Drop goal "${label}" — saves ${Math.round(save / 60)} h`,
    fixExclude: (track: string, save: number) => `Exclude track ${track} — saves ${Math.round(save / 60)} h`,
    fixApply: "Apply", fixAuto: "Optimize for me", fixFits: "✓ closes the gap",
  },
  ru: {
    target: "Целевая дата",
    hours: "Часов по будням — поменяй колонку, 0 = выходной",
    weekTotal: (h: number, off: number) => `${fmtH(h)} ч в неделю · выходных: ${off}`,
    blackouts: "Нерабочие даты", add: "+ добавить", addLabel: "Добавить нерабочую дату", remove: "убрать",
    depth: "Глубина чтения", days: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
    junior: "junior", middle: "middle", senior: "senior",
    onTrack: "В графике", over: "Не укладываемся", under: "С запасом",
    daysLeft: "дней осталось", have: "есть", need: (h: number) => `нужно ${fmtH(h)}ч`,
    schedHead: "План по датам · первые дни",
    honestFits: (slack: number) => `Вполне выполнимо — около ${fmtH(slack)} ч запаса к дате при такой загрузке.`,
    honestUnder: (slack: number) => `С опережением — примерно ${fmtH(slack)} ч запаса; можно углубиться или взять задачи вперёд.`,
    honestOver: (deficit: number) => `Отстаём примерно на ${fmtH(deficit)} ч.`,
    dropTail: (titles: string) => ` Не успеть к дате: ${titles}. Подними часы по будням или сдвинь дату.`,
    overTail: " Подними часы по будням или сдвинь дату.",
    today: "сегодня", dayOff: "Выходной", blackout: "Нерабочий — без учёбы", review: "Повторение и карточки",
    empty: "Задай целевую дату — движок построит честный план по датам из твоей реальной загрузки по будням.",
    aria: (d: string) => `${d}, часов`,
    sig: "Подпись. Задай дату и реальные часы по будням; движок вернёт план по датам и честный вердикт — включая то, что выпадет, если бюджет не сходится.",
    hoursUnit: "ч",
    paceHead: "Темп",
    paceDone: (done: number, total: number) => `Сделано ${done} из ${total} ч`,
    paceBehind: (days: number) => `отстаёшь ~${days} дн. при текущем темпе`,
    paceAhead: "С опережением графика",
    paceOnTrack: "В графике",
    paceFinish: (d: string) => `прогноз финиша ${d}`,
    fixHead: "Как уложиться",
    fixRaise: (h: number, save: number) => `+${fmtH(h)} ч в каждый будний день — освободит ${Math.round(save / 60)} ч`,
    fixExtend: (d: number, save: number) => `Сдвинь дату на +${d} дн. — освободит ${Math.round(save / 60)} ч`,
    fixDepth: (tier: string, save: number) => `Читай на глубине ${tier} — сэкономит ${Math.round(save / 60)} ч`,
    fixDrop: (label: string, save: number) => `Снять цель «${label}» — сэкономит ${Math.round(save / 60)} ч`,
    fixExclude: (track: string, save: number) => `Исключить трек ${track} — сэкономит ${Math.round(save / 60)} ч`,
    fixApply: "Применить", fixAuto: "Оптимизировать за меня", fixFits: "✓ закрывает дефицит",
  },
} as const;

// Minutes EAST of UTC. Engine convention (schedule.ts studyDays): `ms + tzOffsetMin*60000`
// must land on the local wall-clock day, so this is the NEGATIVE of getTimezoneOffset().
function tzNow(): number { return -new Date().getTimezoneOffset(); }
// Format a (local-midnight) instant back to its local YYYY-MM-DD for the date input value.
function isoOf(ms: number): string {
  const d = new Date(ms); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const DEFAULT_HOURS = [2, 2, 2, 1.5, 1.5, 0, 0]; // Mon..Sun seed when first enabling

function currentTier(): Tier {
  const dt = config.value.depthTier;
  return typeof dt === "string" ? dt : "middle";
}

/* ── Blackout date chips ─────────────────────────────────────────────────────── */
function BlackoutList({ lang, dates, onAdd, onRemove }: { lang: Locale; dates: string[]; onAdd: (iso: string) => void; onRemove: (iso: string) => void }) {
  const t = L[lang];
  const [adding, setAdding] = useState(false);
  return (
    <div class="blackouts">
      {dates.map((iso) => (
        <span key={iso} class="blackout">{iso}<button type="button" class="x" aria-label={`${t.remove} ${iso}`} onClick={() => onRemove(iso)}>{"×"}</button></span>
      ))}
      {adding ? (
        <span class="blackout-input">
          <input
            type="date"
            aria-label={t.addLabel}
            onChange={(e) => {
              const v = (e.target as HTMLInputElement).value;
              if (v) onAdd(v);
              setAdding(false);
            }}
            onBlur={() => setAdding(false)}
          />
        </span>
      ) : (
        <button type="button" class="blackout add" onClick={() => setAdding(true)}>{t.add}</button>
      )}
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────────── */
export default function DeadlineSection({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value;            // subscribe
  const dl = cfg.deadline;
  const { schedule } = computePath();  // subscribe (recomputes on every write)
  const tier = currentTier();

  // Compose a full DeadlineConfig from the current one + a patch, then persist.
  // The deadline is only meaningful once a target date exists: setDate supplies targetDateMs
  // in `patch` on first activation; weekday/blackout edits before a date is set are ignored.
  // No Date.now() fallback — the schedule must derive from a date the user actually picked.
  const writeDeadline = (patch: Partial<DeadlineConfig>) => {
    const base: DeadlineConfig | undefined = dl ?? (patch.targetDateMs != null
      ? { targetDateMs: patch.targetDateMs, perWeekdayHours: [...DEFAULT_HOURS], blackoutDates: [], tzOffsetMin: tzNow() }
      : undefined);
    if (!base) return;
    setDeadline({ ...base, ...patch, tzOffsetMin: tzNow() });
  };

  const setDate = (iso: string) => {
    if (!iso) { setDeadline(undefined); return; } // clearing the date drops the deadline
    const targetDateMs = Date.parse(iso + "T00:00:00"); // local midnight of the picked day
    if (Number.isNaN(targetDateMs)) return;
    writeDeadline({ targetDateMs });
  };
  const setHour = (i: number, v: number) => {
    const base = dl?.perWeekdayHours ?? [...DEFAULT_HOURS];
    const perWeekdayHours = base.map((h, j) => (j === i ? v : h));
    writeDeadline({ perWeekdayHours });
  };
  const addBlackout = (iso: string) => {
    const cur = dl?.blackoutDates ?? [];
    if (cur.includes(iso)) return;
    writeDeadline({ blackoutDates: [...cur, iso].sort() });
  };
  const removeBlackout = (iso: string) => {
    writeDeadline({ blackoutDates: (dl?.blackoutDates ?? []).filter((d) => d !== iso) });
  };
  const setTier = (tr: Tier) => setKnob({ depthTier: tr });

  const hours = dl?.perWeekdayHours ?? [...DEFAULT_HOURS];

  return (
    <div>
      <div class="panel">
        <div class="deadline">
          {/* config (input) */}
          <div class="dl-config">
            <div class="field-row">
              <label for="dlDate">{t.target}</label>
              <div class="dl-input">
                <input type="date" id="dlDate" value={dl ? isoOf(dl.targetDateMs) : ""} onInput={(e) => setDate((e.target as HTMLInputElement).value)} />
              </div>
            </div>

            <div class="field-row">
              <label>{t.hours}</label>
              <HoursPicker lang={lang} hours={hours} onSet={setHour} />
            </div>

            <div class="field-row">
              <label>{t.blackouts}</label>
              <BlackoutList lang={lang} dates={dl?.blackoutDates ?? []} onAdd={addBlackout} onRemove={removeBlackout} />
            </div>

            <div class="field-row">
              <label>{t.depth}</label>
              <div class="seg depth" role="group" aria-label={t.depth}>
                {TIERS.map((tr) => (
                  <button key={tr} type="button" aria-pressed={tier === tr} onClick={() => setTier(tr)}>{t[tr]}</button>
                ))}
              </div>
            </div>
          </div>

          {/* output */}
          {schedule ? <DeadlineOutput lang={lang} schedule={schedule} /> : (
            <div class="dl-output empty"><p>{t.empty}</p></div>
          )}
        </div>
      </div>
      <p class="fig-caption"><b>{t.sig.split(".")[0]}.</b>{t.sig.slice(t.sig.indexOf(".") + 1)}</p>
    </div>
  );
}

/* ── Output (verdict + budget + dated schedule), all derived from real Schedule ─ */
function DeadlineOutput({ lang, schedule }: { lang: Locale; schedule: Schedule }) {
  const t = L[lang];
  const f = schedule.feasibility;
  const budget = scheduleBudget(schedule);
  const cls = f.verdict === "over" ? "over" : f.verdict === "under" ? "under" : "ontrack";
  const state = f.verdict === "over" ? t.over : f.verdict === "under" ? t.under : t.onTrack;

  // Honest sentence — built from the real feasibility verdict, delta, and dropped units.
  const slackH = f.deltaMin / 60;
  let honest = f.verdict === "over" ? t.honestOver(f.deltaMin / 60) : f.verdict === "under" ? t.honestUnder(slackH) : t.honestFits(slackH);
  if (f.verdict === "over") {
    if (f.dropped.length > 0) {
      const titles = f.dropped.map((u) => content.unitTitleById.get(u)?.[lang] ?? u).slice(0, 4).join(", ");
      honest += t.dropTail(titles + (f.dropped.length > 4 ? "…" : ""));
    } else {
      honest += t.overTail;
    }
  }

  // Dated schedule — first ~6 non-empty days from the real plan, today marker on the first.
  const planned = schedule.days.filter((d) => d.steps.length > 0).slice(0, 6);

  return (
    <div class="dl-output">
      <div class={`dl-verdict ${cls}`}>
        <div class="v-row">
          <span class="v-state">{state}</span>
          <span class="v-count">{schedule.countdownDays} <em>{t.daysLeft}</em></span>
        </div>
        <div class="budget">
          <span>{t.have} {fmtH(Math.round(budget.availMin / 60))}h</span>
          <span class="bbar"><div class="bfill" style={`width:${budget.pct}%`} /></span>
          <span>{t.need(Math.round(budget.needMin / 60))}</span>
        </div>
        <p class="v-honest">{honest}</p>
        <PaceRow lang={lang} />
        <FixList lang={lang} />
      </div>

      {planned.length > 0 && (
        <div>
          <div class="panel-head" style="margin-bottom:var(--s-2)">
            <span class="ph-label">{t.schedHead}</span>
          </div>
          <div class="sched-list">
            {planned.map((d, i) => (
              <div key={d.date} class="sched-day">
                <div class={`sd-date${i === 0 ? " today" : ""}`}>{i === 0 ? t.today : d.date}</div>
                <div class="sd-plan">
                  {d.steps.map((s) => content.unitTitleById.get(s.unit)?.[lang] ?? s.unit).join(" · ")}
                </div>
                <div class="sd-min">{d.minutes}m</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pace row + Fix list ─────────────────────────────────────────────────────── */
type LStrings = typeof L["en"] | typeof L["ru"];

function fixLabel(lang: Locale, t: LStrings, f: Fix): string {
  const save = f.deltaMin;
  switch (f.kind) {
    case "raise-hours":   return t.fixRaise(f.patch.hours as number, save);
    case "extend-date":   return t.fixExtend(f.patch.days as number, save);
    case "lower-depth":   return t.fixDepth(f.patch.tier as string, save);
    case "drop-goal":     return t.fixDrop((f.patch.label as string) ?? (f.patch.goalId as string), save);
    case "exclude-track": return t.fixExclude(f.patch.track as string, save);
  }
}

function FixList({ lang }: { lang: Locale }) {
  const t = L[lang];
  const { fixes, combo, deficitMin } = currentFixes();
  if (fixes.length === 0) return null;
  return (
    <div class="fixlist">
      <div class="panel-head" style="margin:var(--s-3) 0 var(--s-2)"><span class="ph-label">{t.fixHead}</span></div>
      <ul class="fix-items">
        {fixes.map((f, i) => (
          <li key={i} class="fix-item">
            <span class="fix-text">{fixLabel(lang, t, f)}{f.closesGap && <em class="fix-fits"> {t.fixFits}</em>}</span>
            <button type="button" class="btn btn-sm" onClick={() => applyFix(f)}>{t.fixApply}</button>
          </li>
        ))}
      </ul>
      {deficitMin > 0 && combo.length > 0 && (
        <button type="button" class="btn btn-primary btn-sm fix-auto" onClick={() => applyCombo(combo)}>{t.fixAuto}</button>
      )}
    </div>
  );
}

function PaceRow({ lang }: { lang: Locale }) {
  const t = L[lang];
  const p = currentPace();
  if (!p || p.status === "no-data") return null;
  const dl = config.value.deadline;
  if (!dl) return null; // p is non-null only when a deadline exists; explicit guard avoids the non-null assertion

  const doneH = Math.round(p.doneMin / 60);
  const totalH = Math.round((dl.baselineRequiredMin ?? 0) / 60);
  const finish = p.projectedFinishMs ? new Date(p.projectedFinishMs).toISOString().slice(0, 10) : null;
  const state = p.status === "behind" ? t.paceBehind(p.behindDays) : p.status === "ahead" ? t.paceAhead : t.paceOnTrack;
  // Note: PaceStatus uses "on-track" (hyphen) for the neutral state — the ternary above covers it as the else branch.
  return (
    <div class={`pace-row ${p.status}`}>
      <span class="ph-label">{t.paceHead}</span>
      <span class="pace-done">{t.paceDone(doneH, totalH)}</span>
      <span class="pace-state">{state}</span>
      {finish && p.status === "behind" && <span class="pace-finish">{t.paceFinish(finish)}</span>}
    </div>
  );
}
