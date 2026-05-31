// site/src/components/english/EnglishDashboard.tsx
import { useEffect } from "preact/hooks";
import { englishState, getPlacement, dueWordIds, englishKnownTotal } from "~/english/state";
import { knownByBand, readUnitsCount, gradedOutputCount, grammarDoneCount, collocationDoneCount } from "~/english/stats";
import { startEnglishSync } from "~/english/sync";
import { userState } from "~/scripts/user-state";
import { englishXp } from "~/english/xp";
import { ACHIEVEMENTS } from "~/scripts/progression/achievements";
import { BAND_SIZE } from "~/english/data/bands";
import type { Band } from "~/english/types";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };
const BANDS: Band[] = ["A2", "B1", "B2"];
const now = () => Date.now();

export default function EnglishDashboard({ lang }: Props) {
  englishState.value; userState.value; // subscribe
  useEffect(() => { const stop = startEnglishSync(); return stop; }, []);

  const summary = userState.value.progression.englishSummary;
  // Prefer live local state; fall back to synced summary on a fresh device.
  const hasLocal = Object.keys(englishState.value.words).length > 0 || !!getPlacement();
  const kb = hasLocal ? knownByBand() : (summary?.knownByBand ?? { A2: 0, B1: 0, B2: 0 });
  const total = kb.A2 + kb.B1 + kb.B2;
  const band = getPlacement()?.band ?? summary?.band ?? "none";
  const read = hasLocal ? readUnitsCount() : (summary?.readUnits ?? 0);
  const grammar = hasLocal ? grammarDoneCount() : (summary?.grammarDone ?? 0);
  const colloc = hasLocal ? collocationDoneCount() : (summary?.collocationDone ?? 0);
  const graded = hasLocal ? gradedOutputCount() : (summary?.graded ? 1 : 0);
  const due = dueWordIds(Object.keys(englishState.value.words), now()).length;
  const streak = userState.value.progression.streak;
  const enXp = englishXp(englishKnownTotal());

  const earned = ACHIEVEMENTS.filter(
    (a) => a.id.startsWith("en-") && a.id in (userState.value.progression.achievements ?? {}),
  );

  const L = {
    title: lang === "en" ? "Your English" : "Твой английский",
    words: lang === "en" ? "words known" : "слов знаешь",
    read: lang === "en" ? "texts read" : "текстов прочитано",
    grammar: lang === "en" ? "grammar" : "грамматика",
    colloc: lang === "en" ? "phrases" : "фразы",
    graded: lang === "en" ? "graded writings" : "оценок письма",
    due: lang === "en" ? "due today" : "к повтору",
    streak: lang === "en" ? "day streak" : "дней подряд",
    xp: lang === "en" ? "English XP" : "XP за английский",
  };

  const Bar = ({ b }: { b: Band }) => {
    const pct = Math.min(100, Math.round((kb[b] / BAND_SIZE[b]) * 100));
    return (
      <div class="flex items-center gap-2">
        <span class="text-[11px] font-mono uppercase text-muted w-6">{b}</span>
        <div class="flex-1 h-2 bg-rule rounded-[2px] overflow-hidden">
          <div class="h-full bg-ink" style={`width:${pct}%`} />
        </div>
        <span class="text-[11px] font-mono text-muted w-16 text-right">{kb[b]}/{BAND_SIZE[b]}</span>
      </div>
    );
  };

  const Stat = ({ n, label }: { n: number; label: string }) => (
    <div class="flex flex-col">
      <span class="font-display text-[20px] font-bold text-ink">{n}</span>
      <span class="text-[11px] text-muted">{label}</span>
    </div>
  );

  return (
    <div class="max-w-[620px] mx-auto bg-card border border-rule-strong rounded-[2px] p-6 flex flex-col gap-5">
      <div class="flex items-baseline justify-between">
        <div class="meta">{L.title}</div>
        <div class="text-[12px] font-mono text-muted">{band === "none" ? "—" : band} · {total} {L.words}</div>
      </div>
      <div class="flex flex-col gap-2">{BANDS.map((b) => <Bar key={b} b={b} />)}</div>
      <div class="grid grid-cols-3 gap-4">
        <Stat n={read} label={L.read} />
        <Stat n={grammar} label={L.grammar} />
        <Stat n={colloc} label={L.colloc} />
        <Stat n={graded} label={L.graded} />
        <Stat n={due} label={L.due} />
        <Stat n={streak?.count ?? 0} label={L.streak} />
      </div>
      <div class="flex items-center justify-between border-t border-rule pt-3">
        <div class="text-[12px] font-mono text-muted">{enXp} {L.xp}</div>
        {earned.length ? (
          <div class="flex gap-1">{earned.map((a) => <span key={a.id} title={a.label[lang]} class="text-[16px]">{a.icon}</span>)}</div>
        ) : null}
      </div>
    </div>
  );
}
