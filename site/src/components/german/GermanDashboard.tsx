// site/src/components/german/GermanDashboard.tsx
// Local-only progress panel for the German layer (v1): per-band bars, total known,
// due today, and German XP. Mirrors site/src/components/english/EnglishDashboard.tsx
// but reads LOCAL germanState/germanSummary stats only — no synced summary, no
// achievements, no sync side effects.
import { germanState, getPlacement, dueWordIds, germanKnownTotal } from "~/german/state";
import { knownByBand, readUnitsCount, grammarDoneCount, collocationDoneCount } from "~/german/stats";
import { germanXp } from "~/german/xp";
import { BAND_SIZE } from "~/german/data/bands";
import type { GerBand } from "~/german/types";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };
const BANDS: GerBand[] = ["A1", "A2", "B1"];
const now = () => Date.now();

export default function GermanDashboard({ lang }: Props) {
  germanState.value; // subscribe

  const kb = knownByBand();
  const total = kb.A1 + kb.A2 + kb.B1;
  const band = getPlacement()?.band ?? "none";
  const read = readUnitsCount();
  const grammar = grammarDoneCount();
  const colloc = collocationDoneCount();
  const due = dueWordIds(Object.keys(germanState.value.words), now()).length;
  const deXp = germanXp(germanKnownTotal());

  const L = {
    title: lang === "en" ? "Your German" : "Твой немецкий",
    words: lang === "en" ? "words known" : "слов знаешь",
    read: lang === "en" ? "texts read" : "текстов прочитано",
    grammar: lang === "en" ? "grammar" : "грамматика",
    colloc: lang === "en" ? "phrases" : "фразы",
    due: lang === "en" ? "due today" : "к повтору",
    xp: lang === "en" ? "German XP" : "XP за немецкий",
  };

  const Bar = ({ b }: { b: GerBand }) => {
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
        <Stat n={due} label={L.due} />
      </div>
      <div class="flex items-center justify-between border-t border-rule pt-3">
        <div class="text-[12px] font-mono text-muted">{deXp} {L.xp}</div>
      </div>
    </div>
  );
}
