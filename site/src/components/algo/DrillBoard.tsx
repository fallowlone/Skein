import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { nextStatus, needsRevisit, loadStore, saveEntry, type DrillStatus } from "./drill-state";

type Problem = {
  id: string; leetcodeId: number; slug: string; title: string;
  difficulty: "easy" | "medium" | "hard"; pattern: string; targetMinutes: number;
  hints: { en: string; ru: string }[];
  followUp?: { en: string; ru: string };
  companies: string[];
};
type Props = { lang: Locale; problems: Problem[] };

const DIFF_LABEL: Record<string, Record<Locale, string>> = {
  easy: { en: "Easy", ru: "Лёгкая" },
  medium: { en: "Medium", ru: "Средняя" },
  hard: { en: "Hard", ru: "Сложная" },
};

function ProblemCard({ p, lang, now }: { p: Problem; lang: Locale; now: number }) {
  const store = loadStore();
  const [status, setStatus] = useState<DrillStatus>(store[p.id]?.status ?? "unattempted");
  const [revealed, setRevealed] = useState(0);
  const revisit = needsRevisit({ status, at: store[p.id]?.at ?? 0 }, now);
  const url = `https://leetcode.com/problems/${p.slug}/`;

  function cycle() {
    const ns = nextStatus(status);
    setStatus(ns);
    saveEntry(p.id, ns, now);
  }

  return (
    <div class="border border-rule rounded-md p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <a class="font-semibold hover:underline" href={url} target="_blank" rel="noreferrer noopener">
          #{p.leetcodeId} {p.title}
        </a>
        <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rule/40">{DIFF_LABEL[p.difficulty][lang]}</span>
        <span class="text-[11px] text-muted font-mono">⏱ {p.targetMinutes}m</span>
        {revisit && <span class="text-[10px] font-mono text-[color:var(--accent,#b8860b)]">↻ revisit</span>}
        <span class="flex-1" />
        <button class="btn ghost text-[11px]" style="padding:2px 8px;" onClick={cycle}>
          {status === "unattempted" ? "○" : status === "attempted" ? "◐" : "●"} {status}
        </button>
      </div>
      {p.companies.length > 0 && (
        <div class="flex gap-1.5 flex-wrap">
          {p.companies.map((c) => <span class="text-[10px] text-muted font-mono">{c}</span>)}
        </div>
      )}
      <div class="flex flex-col gap-1">
        {p.hints.slice(0, revealed).map((h) => (
          <p class="text-[13px] text-ink-2 pl-3 border-l-2 border-rule">{h[lang]}</p>
        ))}
        {revealed < p.hints.length && (
          <button class="text-[12px] text-muted hover:text-ink text-left" onClick={() => setRevealed(revealed + 1)}>
            {lang === "ru" ? `Подсказка ${revealed + 1} из ${p.hints.length}` : `Reveal hint ${revealed + 1} of ${p.hints.length}`}
          </button>
        )}
      </div>
      {p.followUp && (
        <details class="text-[12px] text-muted">
          <summary class="cursor-pointer">{lang === "ru" ? "Follow-up (вслух)" : "Follow-up (aloud)"}</summary>
          <p class="mt-1 text-ink-2">{p.followUp[lang]}</p>
        </details>
      )}
    </div>
  );
}

export default function DrillBoard({ lang, problems }: Props) {
  const groups: { pattern: string; items: Problem[] }[] = [];
  for (const p of problems) {
    let g = groups.find((x) => x.pattern === p.pattern);
    if (!g) { g = { pattern: p.pattern, items: [] }; groups.push(g); }
    g.items.push(p);
  }
  const now = Date.now();
  const solved = problems.filter((p) => loadStore()[p.id]?.status === "solved").length;

  return (
    <div class="flex flex-col gap-6">
      <p class="text-[12px] text-muted font-mono">{solved}/{problems.length} solved</p>
      {groups.map((g) => (
        <section class="flex flex-col gap-2">
          <h3 class="font-mono text-[12px] uppercase tracking-wider text-muted">{g.pattern.replace(/-/g, " ")}</h3>
          {g.items.map((p) => <ProblemCard p={p} lang={lang} now={now} />)}
        </section>
      ))}
    </div>
  );
}
