// src/components/path/planning/TodayFocus.tsx
// Top-of-screen focus: what to do TODAY. Deadline set → today's schedule row; otherwise the
// next path step. When behind/over, surfaces the single best catch-up action inline.
import type { Locale } from "~/i18n";
import { config, content, computePath, currentPace, currentFixes, applyFix } from "~/scripts/path/path-io";
import unitsJson from "~/content/units.json";

type UnitMeta = { track: string; slug: string; firstLesson?: string; lessonCount: number };
const UNIT_META = new Map<string, UnitMeta>(
  (unitsJson as Array<{ id: string; slug: string; track: string; lessons: string[] }>).map((u) => [u.id, { track: u.track, slug: u.slug, firstLesson: u.lessons?.[0], lessonCount: u.lessons?.length ?? 0 }]),
);
function startHref(lang: Locale, unitId: string): string | null {
  const m = UNIT_META.get(unitId);
  return m?.firstLesson ? `/${lang}/learn/${m.track}/${m.slug}/${m.firstLesson}` : null;
}

function ruLessons(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "урока"; // genitive after «из»
  return "уроков";
}

const L = {
  en: { today: "Today", next: "Next up", start: "Start", min: (m: number) => `~${m} min`,
    done: "Nothing due — you're on top of your plan.", behind: (d: number) => `Behind ~${d} day(s).`, apply: "Apply",
    scope: (n: number) => `This step is a unit of ${n} lesson${n === 1 ? "" : "s"} — it starts at lesson 1; the step is done when you've finished all of them.` },
  ru: { today: "Сегодня", next: "Дальше", start: "Начать", min: (m: number) => `~${m} мин`,
    done: "На сегодня ничего — ты в графике.", behind: (d: number) => `Отстаёшь ~${d} дн.`, apply: "Применить",
    scope: (n: number) => `Этот шаг — юнит из ${n} ${ruLessons(n)}: начинаешь с первого, шаг засчитан, когда пройдены все.` },
} as const;

export default function TodayFocus({ lang }: { lang: Locale }) {
  const t = L[lang];
  const cfg = config.value; // subscribe
  const { path, schedule } = computePath();

  // Today's units (deadline mode) or the next step.
  let head: string = t.next;
  let units: { unit: string; title: string }[] = [];
  let minutes = 0;
  if (schedule) {
    const firstDay = schedule.days.find((d) => d.steps.length > 0);
    if (firstDay) {
      head = t.today;
      minutes = firstDay.minutes;
      units = firstDay.steps.map((s) => ({ unit: s.unit, title: content.unitTitleById.get(s.unit)?.[lang] ?? s.unit }));
    }
  } else if (path.steps.length > 0) {
    const s = path.steps[0];
    units = [{ unit: s.unit, title: content.unitTitleById.get(s.unit)?.[lang] ?? s.unit }];
    minutes = s.estMin;
  }

  if (units.length === 0) return <section class="today-card empty"><p>{t.done}</p></section>;

  const href = startHref(lang, units[0].unit);
  const lessonCount = UNIT_META.get(units[0].unit)?.lessonCount ?? 0;
  const p = currentPace();
  const { fixes, combo } = currentFixes();
  // combo is empty when there's no budget deficit; fall back to the top catch-up lever so the
  // "behind but budget still fits" case still surfaces an action (combo only covers over-budget).
  const catchUp = (p?.status === "behind" || (schedule?.feasibility.verdict === "over")) ? (combo[0] ?? fixes[0]) : undefined;

  return (
    <section class="today-card">
      <div class="tc-main">
        <span class="tc-head">{head}</span>
        <span class="tc-units">{units.map((u) => u.title).join(" · ")}</span>
        <span class="tc-min">{t.min(minutes)}</span>
        {href && <a class="btn btn-primary btn-sm" href={href}><span>{t.start}</span><span class="arrow">→</span></a>}
      </div>
      {lessonCount > 0 && <p class="tc-scope">{t.scope(lessonCount)}</p>}
      {catchUp && (
        <div class="tc-catchup">
          {p?.status === "behind" && <span>{t.behind(p.behindDays)}</span>}
          <button type="button" class="btn btn-sm" onClick={() => applyFix(catchUp)}>{t.apply}</button>
        </div>
      )}
    </section>
  );
}
