// src/components/path/planning/DeadlineSection.tsx
// Signature instrument #2 — deadline / exam-prep mode. Config (date, weekday-hours
// grid, blackout dates, reading-depth) writes a full DeadlineConfig via setDeadline.
// Output (verdict + budget bar + dated schedule) is derived from the real Schedule
// returned by computePath() and the scheduleBudget read-model. No mock arrays.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { DeadlineConfig, Schedule, Tier } from "~/scripts/path/types";
import { config, content, computePath, setDeadline, setKnob } from "~/scripts/path/path-io";
import { scheduleBudget } from "~/scripts/path/schedule-budget";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
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
  },
} as const;

function fmtH(h: number): string { return Number.isInteger(h) ? String(h) : h.toFixed(1); }
function clampHour(v: number): number { return Math.max(0, Math.min(8, Math.round(v * 2) / 2)); }
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

/* ── Weekday-hours stepper grid ──────────────────────────────────────────────── */
function WeekHoursGrid({ lang, hours, onSet }: { lang: Locale; hours: number[]; onSet: (i: number, v: number) => void }) {
  const t = L[lang];
  const bump = (i: number, delta: number) => onSet(i, clampHour((hours[i] ?? 0) + delta));
  const totalH = hours.reduce((a, b) => a + b, 0);
  const off = hours.filter((h) => h === 0).length;
  return (
    <div>
      <div class="weekgrid">
        {DAY_KEYS.map((_, i) => {
          const h = hours[i] ?? 0;
          return (
            <div key={i} class="daycol">
              <div class="dname">{t.days[i]}</div>
              <button
                type="button"
                class={`hstep${h === 0 ? " off" : ""}`}
                role="spinbutton"
                aria-label={t.aria(t.days[i])}
                aria-valuenow={h}
                aria-valuemin={0}
                aria-valuemax={8}
                aria-valuetext={`${fmtH(h)} ${t.hoursUnit}`}
                onClick={() => bump(i, h >= 6 ? -h : 0.5)}
                onContextMenu={(e) => { e.preventDefault(); bump(i, -0.5); }}
                onWheel={(e) => { e.preventDefault(); bump(i, e.deltaY < 0 ? 0.5 : -0.5); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); bump(i, 0.5); }
                  if (e.key === "ArrowDown") { e.preventDefault(); bump(i, -0.5); }
                }}
              >
                <span class="hv">{h === 0 ? "·" : fmtH(h)}</span>
                <span class="hu">{t.hoursUnit}</span>
              </button>
            </div>
          );
        })}
      </div>
      <div class="weekgrid-note">{t.weekTotal(totalH, off)}</div>
    </div>
  );
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
              <WeekHoursGrid lang={lang} hours={hours} onSet={setHour} />
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
