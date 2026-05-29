import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { nextStatus, needsRevisit, loadStore, saveEntry, type DrillStatus, type DrillEntry } from "./drill-state";

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
const NEXT_LABEL: Record<DrillStatus, Record<Locale, string>> = {
  unattempted: { en: "Mark as attempted", ru: "Отметить «в работе»" },
  attempted: { en: "Mark as solved", ru: "Отметить «решено»" },
  solved: { en: "Reset to unattempted", ru: "Сбросить" },
};
const STATUS_LABEL: Record<DrillStatus, Record<Locale, string>> = {
  unattempted: { en: "unattempted", ru: "не начато" },
  attempted: { en: "attempted", ru: "в работе" },
  solved: { en: "solved", ru: "решено" },
};
const GLYPH: Record<DrillStatus, string> = { unattempted: "○", attempted: "◐", solved: "●" };

function ProblemCard({
  p, lang, now, entry, onCycle,
}: {
  p: Problem; lang: Locale; now: number;
  entry: DrillEntry; onCycle: (id: string) => void;
}) {
  const [revealed, setRevealed] = useState(0);
  const revisit = needsRevisit(entry, now);
  const url = `https://leetcode.com/problems/${p.slug}/`;

  return (
    <div class="border border-rule rounded-md p-3 flex flex-col gap-2">
      <div class="flex items-center gap-2 flex-wrap">
        <a class="font-semibold hover:underline" href={url} target="_blank" rel="noreferrer noopener">
          #{p.leetcodeId} {p.title}
        </a>
        <span class="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-rule/40">{DIFF_LABEL[p.difficulty][lang]}</span>
        <span class="text-[11px] text-muted font-mono"><span aria-hidden="true">⏱ </span>{p.targetMinutes}m</span>
        {revisit && (
          <span class="text-[10px] font-mono text-[color:var(--accent,#b8860b)]">
            <span aria-hidden="true">↻ </span>{lang === "ru" ? "повторить" : "revisit"}
          </span>
        )}
        <span class="flex-1" />
        <button
          class="btn ghost text-[11px]"
          style="padding:2px 8px;"
          onClick={() => onCycle(p.id)}
          aria-label={NEXT_LABEL[entry.status][lang]}
        >
          <span aria-hidden="true">{GLYPH[entry.status]} </span>{STATUS_LABEL[entry.status][lang]}
        </button>
      </div>
      {p.companies.length > 0 && (
        <div class="flex gap-1.5 flex-wrap">
          {p.companies.map((c) => <span key={c} class="text-[10px] text-muted font-mono">{c}</span>)}
        </div>
      )}
      <div class="flex flex-col gap-1">
        {p.hints.slice(0, revealed).map((h, i) => (
          <p key={i} class="text-[13px] text-ink-2 pl-3 border-l-2 border-rule">{h[lang]}</p>
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

  // Parent owns the entry map: single localStorage read, live counter, and
  // stable keys for the stateful cards. Cycling updates state + persists.
  const [entries, setEntries] = useState<Record<string, DrillEntry>>(() => {
    const store = loadStore();
    const out: Record<string, DrillEntry> = {};
    for (const p of problems) out[p.id] = store[p.id] ?? { status: "unattempted", at: 0 };
    return out;
  });

  function cycle(id: string) {
    setEntries((prev) => {
      const ns = nextStatus(prev[id]?.status ?? "unattempted");
      saveEntry(id, ns, now);
      return { ...prev, [id]: { status: ns, at: now } };
    });
  }

  const solved = problems.filter((p) => entries[p.id]?.status === "solved").length;

  return (
    <div class="flex flex-col gap-6">
      <p class="text-[12px] text-muted font-mono">{solved}/{problems.length} {lang === "ru" ? "решено" : "solved"}</p>
      {groups.map((g) => (
        <section key={g.pattern} class="flex flex-col gap-2">
          <h3 class="font-mono text-[12px] uppercase tracking-wider text-muted">{g.pattern.replace(/-/g, " ")}</h3>
          {g.items.map((p) => (
            <ProblemCard key={p.id} p={p} lang={lang} now={now} entry={entries[p.id]} onCycle={cycle} />
          ))}
        </section>
      ))}
    </div>
  );
}
