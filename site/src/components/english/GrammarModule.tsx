// site/src/components/english/GrammarModule.tsx
import { useMemo, useState } from "preact/hooks";
import { grammarPoints } from "~/english/data/grammar";
import { collocationSets } from "~/english/data/collocations";
import type { GrammarPoint, CollocationSet } from "~/english/types";
import {
  englishState, getPlacement,
  markGrammarDone, isGrammarDone,
  markCollocationDone, isCollocationDone,
} from "~/english/state";
import { type Locale } from "~/i18n";

type Props = { lang: Locale };
type Tab = "grammar" | "phrasing";

const ORDER = ["A2", "B1", "B2"];
const norm = (s: string) => s.trim().toLowerCase();

export default function GrammarModule({ lang }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band ?? "A2";
  const maxIdx = ORDER.indexOf(band);
  const [tab, setTab] = useState<Tab>("grammar");

  const points = useMemo(
    () => grammarPoints.filter((p) => ORDER.indexOf(p.band) <= maxIdx),
    [maxIdx],
  );

  const L = {
    grammar: lang === "en" ? "Grammar" : "Грамматика",
    phrasing: lang === "en" ? "Phrasing" : "Фразы",
    locked: lang === "en"
      ? "Grammar for your level unlocks as you place up."
      : "Грамматика для твоего уровня откроется после теста уровня.",
  };

  return (
    <div class="max-w-[620px] mx-auto">
      <div class="flex gap-1 mb-6 justify-center">
        <button type="button" class={`btn ${tab === "grammar" ? "" : "ghost"}`} onClick={() => setTab("grammar")}>{L.grammar}</button>
        <button type="button" class={`btn ${tab === "phrasing" ? "" : "ghost"}`} onClick={() => setTab("phrasing")}>{L.phrasing}</button>
      </div>
      {tab === "grammar"
        ? (points.length ? <GrammarList lang={lang} points={points} /> : <p class="text-[14px] text-muted">{L.locked}</p>)
        : <PhrasingList lang={lang} sets={collocationSets} />}
    </div>
  );
}

function GrammarList({ lang, points }: { lang: Locale; points: GrammarPoint[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = points.find((p) => p.id === openId) ?? null;
  if (open) return <GrammarRun lang={lang} point={open} onClose={() => setOpenId(null)} />;
  return (
    <div class="flex flex-col gap-2">
      {points.map((p) => (
        <button key={p.id} type="button" class="text-left bg-card border border-rule rounded-[2px] p-4 hover:border-rule-strong"
          onClick={() => setOpenId(p.id)}>
          <div class="flex items-baseline gap-2">
            <span class="text-[15px] font-semibold text-ink">{p.title[lang]}</span>
            <span class="text-[11px] font-mono uppercase text-muted">{p.band}</span>
            {isGrammarDone(p.id) ? <span class="text-[12px] text-muted ml-auto">✓</span> : null}
          </div>
          <div class="text-[13px] text-muted mt-1">{p.structure[lang]}</div>
        </button>
      ))}
    </div>
  );
}

function GrammarRun({ lang, point, onClose }: { lang: Locale; point: GrammarPoint; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const c = point.cloze[i];
  const done = i >= point.cloze.length;

  const L = {
    back: lang === "en" ? "← Back" : "← Назад",
    check: lang === "en" ? "Check" : "Проверить",
    next: lang === "en" ? "Next" : "Дальше",
    correct: lang === "en" ? "Correct" : "Верно",
    answer: lang === "en" ? "Answer" : "Ответ",
    finish: lang === "en" ? "Done ✓" : "Готово ✓",
    fin: lang === "en" ? "Practice complete." : "Практика пройдена.",
  };

  function next() {
    setChecked(false); setVal("");
    const n = i + 1;
    setI(n);
    if (n >= point.cloze.length) markGrammarDone(point.id);
  }

  const ok = c ? [c.answer, ...(c.alts ?? [])].some((a) => norm(a) === norm(val)) : false;

  return (
    <div class="flex flex-col gap-4">
      <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm self-start" onClick={onClose}>{L.back}</button>
      <div>
        <div class="text-[15px] font-semibold text-ink">{point.title[lang]}</div>
        <div class="text-[13px] text-muted mt-1">{point.explain[lang]}</div>
        {point.register ? <div class="text-[12px] text-muted mt-1 italic">{point.register[lang]}</div> : null}
      </div>
      <div class="flex flex-col gap-1">
        {point.examples.map((ex, k) => (
          <div key={k} class="text-[13px]">
            <span class="text-ink">{ex.en}</span> <span class="text-muted">— {ex.ru}</span>
          </div>
        ))}
      </div>
      {done ? (
        <div class="text-[14px] text-ink">{L.fin}</div>
      ) : (
        <div class="bg-card border border-rule-strong rounded-[2px] p-5 flex flex-col gap-3">
          <div class="text-[14px] text-ink">
            {c.before} <span class="font-mono">[ ___ ]</span> {c.after ?? ""}
          </div>
          <div class="text-[12px] text-muted">{c.hint[lang]}</div>
          <input class="border border-rule rounded-[2px] px-3 py-2 text-[14px] bg-bg text-ink"
            value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)}
            disabled={checked} placeholder="…" />
          {!checked ? (
            <button type="button" class="oa-btn oa-btn-primary oa-btn-sm self-start" onClick={() => setChecked(true)} disabled={!val.trim()}>{L.check}</button>
          ) : (
            <div class="flex flex-col gap-2">
              <div class={`text-[13px] ${ok ? "text-ink" : "text-muted"}`}>
                {ok ? `✓ ${L.correct}` : `${L.answer}: ${c.answer}`}
              </div>
              {c.explain ? <div class="text-[12px] text-muted">{c.explain[lang]}</div> : null}
              <button type="button" class="oa-btn oa-btn-primary oa-btn-sm self-start" onClick={next}>
                {i + 1 >= point.cloze.length ? L.finish : L.next}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhrasingList({ lang, sets }: { lang: Locale; sets: CollocationSet[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = sets.find((s) => s.id === openId) ?? null;
  if (open) return <PhrasingRun lang={lang} set={open} onClose={() => setOpenId(null)} />;
  return (
    <div class="flex flex-col gap-2">
      {sets.map((s) => (
        <button key={s.id} type="button" class="text-left bg-card border border-rule rounded-[2px] p-4 hover:border-rule-strong"
          onClick={() => setOpenId(s.id)}>
          <div class="flex items-baseline gap-2">
            <span class="text-[15px] font-semibold text-ink">{s.title[lang]}</span>
            <span class="text-[11px] font-mono uppercase text-muted">{s.domain}</span>
            {isCollocationDone(s.id) ? <span class="text-[12px] text-muted ml-auto">✓</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function PhrasingRun({ lang, set, onClose }: { lang: Locale; set: CollocationSet; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [val, setVal] = useState("");
  const [checked, setChecked] = useState(false);
  const it = set.items[i];
  const done = i >= set.items.length;

  const L = {
    back: lang === "en" ? "← Back" : "← Назад",
    check: lang === "en" ? "Check" : "Проверить",
    next: lang === "en" ? "Next" : "Дальше",
    answer: lang === "en" ? "Answer" : "Ответ",
    finish: lang === "en" ? "Done ✓" : "Готово ✓",
    fin: lang === "en" ? "Set complete." : "Набор пройден.",
  };

  function next() {
    setChecked(false); setVal("");
    const n = i + 1;
    setI(n);
    if (n >= set.items.length) markCollocationDone(set.id);
  }
  const ok = it ? [it.answer, ...(it.alts ?? [])].some((a) => norm(a) === norm(val)) : false;

  return (
    <div class="flex flex-col gap-4">
      <button type="button" class="oa-btn oa-btn-secondary oa-btn-sm self-start" onClick={onClose}>{L.back}</button>
      <div class="text-[15px] font-semibold text-ink">{set.title[lang]}</div>
      {done ? (
        <div class="text-[14px] text-ink">{L.fin}</div>
      ) : (
        <div class="bg-card border border-rule-strong rounded-[2px] p-5 flex flex-col gap-3">
          <div class="text-[14px] text-ink font-mono">{it.gap}</div>
          <div class="text-[12px] text-muted">{it.ru}</div>
          <input class="border border-rule rounded-[2px] px-3 py-2 text-[14px] bg-bg text-ink"
            value={val} onInput={(e) => setVal((e.target as HTMLInputElement).value)}
            disabled={checked} placeholder="…" />
          {!checked ? (
            <button type="button" class="oa-btn oa-btn-primary oa-btn-sm self-start" onClick={() => setChecked(true)} disabled={!val.trim()}>{L.check}</button>
          ) : (
            <div class="flex flex-col gap-2">
              <div class={`text-[13px] ${ok ? "text-ink" : "text-muted"}`}>
                {ok ? `✓ ${it.chunk}` : `${L.answer}: ${it.chunk}`}
              </div>
              <div class="text-[13px] text-ink italic">“{it.example}”</div>
              {it.note ? <div class="text-[12px] text-muted">{it.note[lang]}</div> : null}
              <button type="button" class="oa-btn oa-btn-primary oa-btn-sm self-start" onClick={next}>
                {i + 1 >= set.items.length ? L.finish : L.next}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
