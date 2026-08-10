// site/src/components/interview/InterviewQABank.tsx
// Browsable Q&A bank + drill mode for interview prep questions.
import { useState, useMemo } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import type { InterviewQData } from "~/types/interview";

type Props = {
  lang: Locale;
  categories: string[];
  data: InterviewQData;
};

type DrillState = {
  category: string;
  questionIdx: number;
  answered: boolean;
};

export default function InterviewQABank({ lang, categories, data }: Props) {
  const [mode, setMode] = useState<"browse" | "drill">("browse");
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [drill, setDrill] = useState<DrillState>({
    category: categories[0] ?? "",
    questionIdx: 0,
    answered: false,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result: Array<{ cat: string; question: { title: string; slug: string; answer: string; url: string } }> = [];
    for (const cat of categories) {
      if (activeCategory !== "all" && cat !== activeCategory) continue;
      for (const qn of data[cat].questions) {
        if (q && !qn.title.toLowerCase().includes(q) && !qn.answer.toLowerCase().includes(q)) continue;
        result.push({ cat, question: qn });
      }
    }
    return result;
  }, [categories, data, activeCategory, search]);

  const drillQuestion = useMemo(() => {
    if (!data[drill.category]) return null;
    const q = data[drill.category].questions[drill.questionIdx];
    return q ?? null;
  }, [data, drill.category, drill.questionIdx]);

  const drillTotal = data[drill.category]?.questions.length ?? 0;

  function next() {
    if (!data[drill.category]) return;
    const nextIdx = (drill.questionIdx + 1) % drillTotal;
    setDrill({ ...drill, questionIdx: nextIdx, answered: false });
  }

  function prev() {
    if (!data[drill.category]) return;
    const prevIdx = (drill.questionIdx - 1 + drillTotal) % drillTotal;
    setDrill({ ...drill, questionIdx: prevIdx, answered: false });
  }

  const totalQ = Object.values(data).reduce((s, c) => s + c.questions.length, 0);

  return (
    <div class="iq-bank">
      {/* Mode toggle */}
      <div class="iq-tabs mb-6">
        <button
          type="button"
          class={`iq-tab ${mode === "browse" ? "on" : ""}`}
          onClick={() => setMode("browse")}
        >
          {t("interviewQA.browse", lang)}
        </button>
        <button
          type="button"
          class={`iq-tab ${mode === "drill" ? "on" : ""}`}
          onClick={() => setMode("drill")}
        >
          {t("interviewQA.drill", lang)}
        </button>
      </div>

      {mode === "browse" && (
        <div class="iq-browse">
          {/* Category filter + search */}
          <div class="iq-filter">
            <div class="iq-cats">
              <button
                type="button"
                class={`iq-cat ${activeCategory === "all" ? "on" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                {t("interviewQA.all", lang)} ({totalQ})
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  class={`iq-cat ${activeCategory === cat ? "on" : ""}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat} ({data[cat].questions.length})
                </button>
              ))}
            </div>
            <input
              type="search"
              class="iq-search"
              placeholder={t("interviewQA.search", lang)}
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Question list */}
          <div class="iq-list">
            {filtered.length === 0 ? (
              <p class="text-muted">{t("interviewQA.empty", lang)}</p>
            ) : (
              filtered.map(({ cat, question }) => (
                <details class="iq-item" key={question.slug}>
                  <summary class="iq-summary">
                    <span class="iq-cat-badge">{cat}</span>
                    <span class="iq-q-title">{question.title}</span>
                  </summary>
                  <div class="iq-answer">
                    <div class="iq-answer-body" innerHTML={question.answer} />
                    <a class="iq-source" href={question.url} target="_blank" rel="noopener noreferrer">
                      {t("interviewQA.source", lang)} →
                    </a>
                  </div>
                </details>
              ))
            )}
          </div>
        </div>
      )}

      {mode === "drill" && drillQuestion && (
        <div class="iq-drill">
          <div class="iq-drill-header">
            <span class="iq-cat-badge">{drill.category}</span>
            <span class="iq-drill-count">
              {drill.questionIdx + 1} / {drillTotal}
            </span>
          </div>
          <div class="iq-drill-question">{drillQuestion.title}</div>
          <div class="iq-drill-answer">
            {drill.answered ? (
              <div class="iq-answer-body" innerHTML={drillQuestion.answer} />
            ) : (
              <button
                type="button"
                class="iq-reveal"
                onClick={() => setDrill({ ...drill, answered: true })}
              >
                {t("interviewQA.showAnswer", lang)}
              </button>
            )}
          </div>
          <div class="iq-drill-footer">
            <button type="button" class="iq-nav-btn" onClick={prev} disabled={drill.questionIdx === 0}>
              {t("interviewQA.prev", lang)}
            </button>
            <select
              class="iq-cat-select"
              value={drill.category}
              onInput={(e) => {
                const cat = (e.target as HTMLSelectElement).value;
                setDrill({ category: cat, questionIdx: 0, answered: false });
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <button type="button" class="iq-nav-btn" onClick={next}>
              {t("interviewQA.next", lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
