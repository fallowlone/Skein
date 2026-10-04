import { Button as ShadcnButton } from "~/components/ui/button";
// src/components/path/AimStage.tsx
// Stage 1 of probabilistic placement: pick a goal, then self-mark each technology with two
// questions — how deep (never / basics / prod) and how well it's remembered (fresh / rusty / patchy).
// Families are collapsible groups with a bulk mark; the per-track marks seed the Bayesian priors,
// prune "never" tracks from the deep run, and are declared into the knowledge map so tracks without
// a question bank still shape the path. The goal is written through setGoals.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { content, activeGoals, setGoals, families } from "~/scripts/path/path-io";
import type { SelfPlace, Recall, SelfMark } from "~/scripts/path/bayes";
import tracksJson from "~/content/tracks.json";

const L = {
  en: {
    kick: "Calibration · step 1 of 2",
    title: "Where are you aiming?",
    note: "≈ 1–2 minutes",
    lead: "A rough mark is enough — the test corrects it. If you know a technology worse than it sounds (used it long ago, or only copied examples), say so and we won't count it as solid.",
    goal: "Goal",
    markTitle: "What do you already know?",
    markNote: "Open an area to mark each technology. Unmarked = never touched.",
    levels: { never: "Never touched", basics: "Basics", prod: "Used in production" } satisfies Record<SelfPlace, string>,
    recallQ: "How is it today?",
    recalls: { fresh: "I remember it well", rusty: "Rusty — long ago", patchy: "I can do it, but not the basics" } satisfies Record<Recall, string>,
    recallHint: {
      fresh: "Treated as a solid base — the test only spot-checks it.",
      rusty: "You knew it once. We won't skip it: it gets a refresher and a check.",
      patchy: "You can get things done without knowing why they work. The test starts from the fundamentals.",
    } satisfies Record<Recall, string>,
    all: "All",
    inTest: (n: number) => `${n} in the test`,
    noTest: "no test questions yet — your mark is used as is",
    count: (m: number, t: number) => `${m} of ${t}`,
    start: "Start the test",
    summary: (n: number) => `${n} marked`,
    none: "Nothing marked — the plan will start from zero.",
    reset: "Clear marks",
    open: "Open",
    close: "Close",
  },
  ru: {
    kick: "Калибровка · шаг 1 из 2",
    title: "Куда ты метишь?",
    note: "≈ 1–2 минуты",
    lead: "Грубой отметки достаточно — тест её поправит. Если знаешь технологию хуже, чем кажется (давно не трогал или только копировал примеры), так и скажи — мы не будем считать её твёрдой.",
    goal: "Цель",
    markTitle: "Что ты уже знаешь?",
    markNote: "Раскрой область и отметь каждую технологию. Без отметки — «не трогал».",
    levels: { never: "Не трогал", basics: "Основы", prod: "Использовал в проде" } satisfies Record<SelfPlace, string>,
    recallQ: "Как с этим сейчас?",
    recalls: { fresh: "Помню хорошо", rusty: "Подзабыл — давно было", patchy: "Делаю, но основ не знаю" } satisfies Record<Recall, string>,
    recallHint: {
      fresh: "Считаем твёрдой базой — тест проверит её выборочно.",
      rusty: "Раньше знал. Не пропустим: освежим и проверим.",
      patchy: "Умеешь делать, не зная, почему это работает. Тест начнёт с основ.",
    } satisfies Record<Recall, string>,
    all: "Все",
    inTest: (n: number) => `в тесте: ${n}`,
    noTest: "вопросов в тесте пока нет — берём твою отметку как есть",
    count: (m: number, t: number) => `${m} из ${t}`,
    start: "Начать тест",
    summary: (n: number) => `отмечено: ${n}`,
    none: "Ничего не отмечено — план начнётся с нуля.",
    reset: "Сбросить отметки",
    open: "Раскрыть",
    close: "Свернуть",
  },
} as const;

const LEVELS: SelfPlace[] = ["never", "basics", "prod"];
const RECALLS: Recall[] = ["fresh", "rusty", "patchy"];
const FRESH: Recall = "fresh";

const trackTitle = new Map<string, { en: string; ru: string }>(
  (tracksJson as { slug: string; title: { en: string; ru: string } }[]).map((t) => [t.slug, t.title]),
);
// "Node.js с нуля до senior" → "Node.js": the marker is about the technology, not the course.
const shortTitle = (s: string): string =>
  s.replace(/,?\s*(from zero to senior|zero to senior|с нуля до senior)\s*$/i, "").replace(/:\s*от нуля до сеньора\s*$/i, "").trim();

// Test-bank size per track, so each row can say honestly whether the test can probe it.
const bankSize = new Map<string, number>();
for (const id of content.diagnosedConcepts) {
  const tr = content.conceptById.get(id)?.track as string;
  bankSize.set(tr, (bankSize.get(tr) ?? 0) + 1);
}

type Marks = Record<string, SelfMark>;
type Props = { lang: Locale; onDone: (marks: Marks) => void };

export default function AimStage({ lang, onDone }: Props) {
  const t = L[lang];
  const goals = content.goals;
  const fams = families();
  const [goalId, setGoalId] = useState(activeGoals()[0]?.id ?? goals[0]?.id ?? "");
  const [marks, setMarks] = useState<Marks>({});
  const [openFams, setOpenFams] = useState<Set<string>>(new Set());

  const level = (track: string): SelfPlace => marks[track]?.level ?? "never";
  const markedCount = Object.values(marks).filter((m) => m.level !== "never").length;

  const setLevel = (track: string, lv: SelfPlace) =>
    setMarks((m) => {
      // "patchy" only makes sense for hands-on work; stepping down to basics drops it.
      const recall = lv === "never" || (lv === "basics" && m[track]?.recall === "patchy") ? FRESH : m[track]?.recall ?? FRESH;
      return { ...m, [track]: { level: lv, recall } };
    });
  const setRecall = (track: string, recall: Recall) =>
    setMarks((m) => ({ ...m, [track]: { level: m[track]?.level ?? "never", recall } }));
  const setFamily = (tracks: string[], lv: SelfPlace) =>
    setMarks((m) => {
      const next = { ...m };
      for (const tr of tracks) next[tr] = { level: lv, recall: FRESH };
      return next;
    });
  const toggleFam = (key: string) =>
    setOpenFams((s) => {
      const next = new Set(s);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const submit = () => {
    if (goalId) setGoals([{ id: goalId, priority: 1 }]);
    onDone(marks);
  };

  return (
    <div class="cal-flow is-wide" data-pt>
      <div class="pt-panel pt-rise">
        <div class="pt-panel-head">
          <span class="pph-kick">{t.kick}</span>
          <h3>{t.title}</h3>
          <span class="pph-note">{t.note}</span>
        </div>

        <p class="aim-lead">{t.lead}</p>

        <div class="ap-goal">
          <span class="ap-label" id="ap-goal-l">{t.goal}</span>
          <div class="ap-goals" role="radiogroup" aria-labelledby="ap-goal-l">
            {goals.map((g) => (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={goalId === g.id}
                class="ap-goal-opt"
                onClick={() => setGoalId(g.id)}
              >
                {g.label[lang]}
              </button>
            ))}
          </div>
        </div>

        <div class="aim-mark-head">
          <span class="amh-title">{t.markTitle}</span>
          <span class="amh-note">{t.markNote}</span>
        </div>

        <div class="ap-fams">
          {fams.map((f) => {
            const open = openFams.has(f.key);
            const marked = f.tracks.filter((tr) => level(tr) !== "never");
            const bulk = f.tracks.every((tr) => level(tr) === level(f.tracks[0])) ? level(f.tracks[0]) : null;
            const names = marked.map((tr) => shortTitle(trackTitle.get(tr)?.[lang] ?? tr)).join(", ");
            return (
              <section key={f.key} class="ap-fam" style={`--d:var(${f.hue})`} data-open={open}>
                <div class="ap-fam-head">
                  <button
                    type="button"
                    class="ap-fam-toggle"
                    aria-expanded={open}
                    aria-controls={`ap-${f.key}`}
                    onClick={() => toggleFam(f.key)}
                  >
                    <span class="sq" aria-hidden="true" />
                    <span class="ap-fam-main">
                      <span class="ap-fam-name">{f.label[lang]}</span>
                      <span class="ap-fam-sum">{marked.length ? names : t.count(0, f.tracks.length)}</span>
                    </span>
                    <span class="ap-fam-count">{t.count(marked.length, f.tracks.length)}</span>
                    <svg class="ap-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <div class="aim-seg ap-bulk" role="group" aria-label={`${f.label[lang]} — ${t.all}`}>
                    {LEVELS.map((lv) => (
                      <ShadcnButton key={lv} type="button" data-level={lv} aria-pressed={bulk === lv} onClick={() => setFamily(f.tracks, lv)}>
                        {t.levels[lv]}
                      </ShadcnButton>
                    ))}
                  </div>
                </div>

                {open && (
                  <div class="ap-tracks" id={`ap-${f.key}`}>
                    {f.tracks.map((tr) => {
                      const m = marks[tr];
                      const lv = level(tr);
                      const n = bankSize.get(tr) ?? 0;
                      const title = trackTitle.get(tr)?.[lang] ?? tr;
                      const recalls = lv === "prod" ? RECALLS : RECALLS.filter((r) => r !== "patchy");
                      return (
                        <div key={tr} class="ap-track">
                          <div class="ap-track-name" title={title}>
                            <span class="ap-track-title">{shortTitle(title)}</span>
                            <span class={`ap-track-meta${n ? "" : " is-none"}`}>{n ? t.inTest(n) : t.noTest}</span>
                          </div>
                          <div class="aim-seg ap-level" role="group" aria-label={title}>
                            {LEVELS.map((x) => (
                              <ShadcnButton key={x} type="button" data-level={x} aria-pressed={lv === x} onClick={() => setLevel(tr, x)}>
                                {t.levels[x]}
                              </ShadcnButton>
                            ))}
                          </div>
                          {lv !== "never" && (
                            <div class="ap-recall">
                              <span class="ap-recall-q">{t.recallQ}</span>
                              <div class="ap-chips" role="group" aria-label={`${title} — ${t.recallQ}`}>
                                {recalls.map((r) => (
                                  <button key={r} type="button" class="ap-chip" data-recall={r} aria-pressed={(m?.recall ?? FRESH) === r} onClick={() => setRecall(tr, r)}>
                                    {t.recalls[r]}
                                  </button>
                                ))}
                              </div>
                              <p class="ap-recall-hint">{t.recallHint[m?.recall ?? FRESH]}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div class="aim-foot">
          <ShadcnButton type="button" class="btn btn-primary" onClick={submit}>
            <span>{t.start}</span><span class="arrow">→</span>
          </ShadcnButton>
          <span class="af-meta">{markedCount ? <b>{t.summary(markedCount)}</b> : t.none}</span>
          {markedCount > 0 && (
            <button type="button" class="ap-reset" onClick={() => setMarks({})}>{t.reset}</button>
          )}
        </div>
      </div>
    </div>
  );
}
