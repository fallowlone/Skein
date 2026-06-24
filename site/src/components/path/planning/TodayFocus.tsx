// src/components/path/planning/TodayFocus.tsx
// Top-of-screen focus: what to do TODAY. Deadline set → today's schedule row; otherwise the
// next path step. When behind/over, surfaces the single best catch-up action inline.
import { useState, useEffect } from "preact/hooks";
import type { Locale } from "~/i18n";
import { config, content, computePath, currentPace, currentFixes, applyFix, dueReviews, currentWeakSpots, computeDoNow } from "~/scripts/path/path-io";
import { userState } from "~/scripts/user-state";
import { ratingToRank } from "~/scripts/progression/ranks";
import { barRatingForGoal, projectRatingDate } from "~/scripts/progression/effective-rating";
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
    scope: (n: number) => `This step is a unit of ${n} lesson${n === 1 ? "" : "s"} — it starts at lesson 1; the step is done when you've finished all of them.`,
    doNow: "Do now", review: "Review", reviewReason: "Due for review", lessonReason: "Next lesson", open: "Open" },
  ru: { today: "Сегодня", next: "Дальше", start: "Начать", min: (m: number) => `~${m} мин`,
    done: "На сегодня ничего — ты в графике.", behind: (d: number) => `Отстаёшь ~${d} дн.`, apply: "Применить",
    scope: (n: number) => `Этот шаг — юнит из ${n} ${ruLessons(n)}: начинаешь с первого, шаг засчитан, когда пройдены все.`,
    doNow: "Делай сейчас", review: "Повторение", reviewReason: "Пора повторить", lessonReason: "Следующий урок", open: "Открыть" },
} as const;

// A practice lessonKey ("<track>/<unit>/<lesson>") maps directly to its reader route. Retrieval
// cards can carry a bare piece slug instead, so only build a lesson link for a real 3-segment key;
// otherwise fall back to the review hub (always valid).
function reviewHref(lang: Locale, lessonKey: string): string {
  return lessonKey.split("/").length >= 3 ? `/${lang}/learn/${lessonKey}` : `/${lang}/review/`;
}

// A review row should read as the lesson it resurfaces, not a generic "Review".
// lessonKey is "<track>/<unit-slug>/<lesson>"; its first two segments are the
// unit id, so the unit title is the most recognisable, client-available label.
// Bare piece slugs (retrieval cards) fall back to a humanised last segment.
function reviewTitle(lang: Locale, lessonKey: string): string {
  const seg = lessonKey.split("/");
  if (seg.length >= 3) {
    const title = content.unitTitleById.get(`${seg[0]}/${seg[1]}`)?.[lang];
    if (title) return title;
  }
  const last = seg[seg.length - 1] ?? lessonKey;
  const words = last.replace(/^\d+[-_]/, "").replace(/[-_]/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : lessonKey;
}

const TIER_REASON: Record<string, { en: string; ru: string }> = {
  recall: { en: "Recall · next task", ru: "Вспомнить · следующая задача" },
  apply: { en: "Apply · next task", ru: "Применить · следующая задача" },
  stretch: { en: "Stretch · next task", ru: "Углубить · следующая задача" },
};
const tierReason = (lang: Locale, d?: string): string =>
  d && TIER_REASON[d] ? TIER_REASON[d][lang] : lang === "ru" ? "Следующая задача" : "Next task";

type LessonTaskIndex = Record<string, { id: string; difficulty: string }[]>;

export default function TodayFocus({ lang }: { lang: Locale }) {
  const t = L[lang];
  // Lazily code-split the per-lesson task index (it is ~0.5MB; dynamic import keeps it out of the
  // main planning bundle). Until it loads, the "do now" list shows unit-level "start" rows; once
  // loaded, lead units upgrade to the specific next task at the learner's adaptive tier.
  const [taskIndex, setTaskIndex] = useState<LessonTaskIndex | null>(null);
  useEffect(() => {
    let alive = true;
    // Relative path (not the ~ alias) so the dynamic import resolves identically in dev, build, and test.
    import("../../../content/path/lesson-tasks.json")
      .then((m) => { if (alive) setTaskIndex(m.default as LessonTaskIndex); })
      .catch((e) => {
        // index is an enhancement — failure just leaves the baseline rows; surface it in dev only
        if (import.meta.env.DEV) console.warn("[TodayFocus] lesson-tasks.json failed to load; do-now task rows disabled:", e);
      });
    return () => { alive = false; };
  }, []);

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

  // Do-now rows: every due review (links to the lesson / review hub), then the next lesson for the
  // first few lead path units. Reviews come first — resurfaced/overdue work outranks fresh study.
  const reviews = dueReviews();
  const seenReviewLessons = new Set<string>();
  const reviewRows = reviews
    .filter((r) => (seenReviewLessons.has(r.lessonKey) ? false : (seenReviewLessons.add(r.lessonKey), true)))
    .slice(0, 5)
    .map((r) => ({ key: r.cardKey, href: reviewHref(lang, r.lessonKey), title: reviewTitle(lang, r.lessonKey), reason: t.reviewReason }));
  // Adaptive "do this specific task next" rows from the tested do-now assembler (computeDoNow →
  // recommendTask at the learner's tier). Only the `task` kind, only once the lazy index has loaded;
  // each upgrades a lead unit's generic "start" row into the exact next task at its difficulty tier.
  const doNowTasks = taskIndex
    ? computeDoNow({ tasksByLesson: (lk) => taskIndex[lk] ?? [], maxUnits: 3, path }).filter((i) => i.kind === "task" && i.lesson)
    : [];
  const coveredUnits = new Set(doNowTasks.map((i) => i.unit));
  const taskRows = doNowTasks.map((i) => ({
    key: `${i.lesson}:${i.taskId}`,
    href: `/${lang}/learn/${i.lesson}`,
    title: content.unitTitleById.get(i.unit)?.[lang] ?? i.unit,
    reason: tierReason(lang, i.difficulty),
  }));
  // Lead "start unit" rows — only for lead units a specific task row hasn't already covered, so the
  // pre-load baseline (all lead units) degrades gracefully into the adaptive view with no duplication.
  const leadRows = path.steps.slice(0, 3).flatMap((s) => {
    if (coveredUnits.has(s.unit)) return [];
    const href = startHref(lang, s.unit);
    if (!href) return [];
    return [{ key: s.unit, href, title: content.unitTitleById.get(s.unit)?.[lang] ?? s.unit, reason: t.lessonReason }];
  });
  const weakRows = currentWeakSpots()
    .map((w) => ({ key: w.unitId, href: startHref(lang, w.unitId), title: content.unitTitleById.get(w.unitId)?.[lang] ?? w.unitId }))
    .filter((r) => r.href) as { key: string; href: string; title: string }[];
  const hasDoNow = reviewRows.length > 0 || taskRows.length > 0 || leadRows.length > 0;

  // Weak-spots section renders independently of hasDoNow: failure evidence on frontier units
  // must surface even when reviewRows and leadRows are both empty (no-trap contract).
  const weakSection = weakRows.length > 0 ? (
    <section class="today-card do-now dn-weak-card">
      <span class="tc-head">{lang === "ru" ? "Слабые места" : "Weak spots"}</span>
      <ul class="dn-list">
        {weakRows.map((r) => (
          <li key={`w:${r.key}`} class="dn-row">
            <a class="dn-link" href={r.href}>
              <span class="dn-title">{r.title}</span>
              <span class="dn-reason">{lang === "ru" ? "тут стабильно ошибаешься" : "you keep missing this"}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  const doNow = hasDoNow ? (
    <section class="today-card do-now">
      <span class="tc-head">{t.doNow}</span>
      <ol class="dn-list">
        {reviewRows.map((r) => (
          <li key={`r:${r.key}`} class="dn-row">
            <a class="dn-link" href={r.href}><span class="dn-title">{r.title}</span><span class="dn-reason">{r.reason}</span></a>
          </li>
        ))}
        {taskRows.map((r) => (
          <li key={`t:${r.key}`} class="dn-row">
            <a class="dn-link" href={r.href}><span class="dn-title">{r.title}</span><span class="dn-reason">{r.reason}</span></a>
          </li>
        ))}
        {leadRows.map((r) => (
          <li key={`l:${r.key}`} class="dn-row">
            <a class="dn-link" href={r.href}><span class="dn-title">{r.title}</span><span class="dn-reason">{r.reason}</span></a>
          </li>
        ))}
      </ol>
    </section>
  ) : null;

  // Cold-start: no path AND nothing due → keep the existing empty card unchanged.
  // Still render weakSection independently so failure evidence surfaces even on cold-start.
  if (units.length === 0) {
    if (weakSection || doNow) {
      return <>{weakSection}{doNow ?? <section class="today-card empty"><p>{t.done}</p></section>}</>;
    }
    return <section class="today-card empty"><p>{t.done}</p></section>;
  }

  const href = startHref(lang, units[0].unit);
  const lessonCount = UNIT_META.get(units[0].unit)?.lessonCount ?? 0;
  const p = currentPace(path); // reuse the path computed above; don't re-run the set-cover
  const us = userState.value;
  const dl = config.value.deadline;
  const goalsSorted = [...config.value.goals].sort((a, b) => a.priority - b.priority);
  const goalId = goalsSorted[0]?.id ?? "senior-fullstack";
  const barRating = barRatingForGoal(goalId);
  const effRating = Math.max(us.pretest?.rating ?? 0, us.progression.studyEma ?? 0);
  const planFeas = schedule ? { verdict: schedule.feasibility.verdict, deltaMin: schedule.feasibility.deltaMin } : null;
  const rf = dl ? projectRatingDate(effRating, barRating, p?.projectedFinishMs ?? null, dl.targetDateMs, planFeas) : null;
  const barLabel = ratingToRank(barRating).label[lang];
  const fmtDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const aheadBehind = (d: number) =>
    d > 0 ? (lang === "ru" ? `на ${d} дн. позже дедлайна` : `${d} days behind deadline`)
    : d < 0 ? (lang === "ru" ? `на ${-d} дн. раньше` : `${-d} days ahead`)
    : (lang === "ru" ? "точно к дедлайну" : "right on deadline");
  const { fixes, combo } = currentFixes();
  // combo is empty when there's no budget deficit; fall back to the top catch-up lever so the
  // "behind but budget still fits" case still surfaces an action (combo only covers over-budget).
  const catchUp = (p?.status === "behind" || (schedule?.feasibility.verdict === "over")) ? (combo[0] ?? fixes[0]) : undefined;

  return (
    <>
      {weakSection}
      {doNow}
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
        {rf && rf.reached && (
          <p class="rating-forecast" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.8;">
            {lang === "ru" ? `Ты достиг планки ${barLabel}` : `You've reached the ${barLabel} bar`}
          </p>
        )}
        {rf && !rf.reached && rf.projectedMs && (
          <p class="rating-forecast" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.8;">
            {lang === "ru"
              ? `При текущем темпе достигнешь планки ${barLabel} к ${fmtDate(rf.projectedMs)} — ${aheadBehind(rf.daysAheadBehind)}`
              : `At this pace you reach the ${barLabel} bar by ${fmtDate(rf.projectedMs)} — ${aheadBehind(rf.daysAheadBehind)}`}
          </p>
        )}
        {rf && !rf.reached && !rf.projectedMs && rf.plan && dl && (
          // No study history yet → plan-feasibility answer, so a just-set deadline still gets a verdict.
          <p class="rating-forecast" style="margin:0.25rem 0 0;font-size:0.85rem;opacity:0.8;">
            {rf.plan.fits
              ? (lang === "ru"
                  ? `По плану выходишь на ${barLabel} к ${fmtDate(dl.targetDateMs)} — запас ~${Math.max(0, Math.round(rf.plan.deltaMin / 60))}ч`
                  : `On plan you reach ${barLabel} by ${fmtDate(dl.targetDateMs)} — ~${Math.max(0, Math.round(rf.plan.deltaMin / 60))}h to spare`)
              : (lang === "ru"
                  ? `По плану не успеваешь к ${fmtDate(dl.targetDateMs)} — не хватает ~${Math.round(rf.plan.deltaMin / 60)}ч`
                  : `On plan you miss ${fmtDate(dl.targetDateMs)} by ~${Math.round(rf.plan.deltaMin / 60)}h`)}
          </p>
        )}
      </section>
    </>
  );
}
