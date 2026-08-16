// site/src/components/interview/InterviewQABank.tsx
// Browsable interview-question bank with progressive, lesson-style answers.
import { useState, useMemo } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import type { InterviewLevel, InterviewQData } from "~/types/interview";
import {
  buildInterviewAnswerLevels,
  INTERVIEW_LEVELS,
  parseInterviewAnswer,
} from "~/scripts/interview/interview-answers";

type Props = {
  lang: Locale;
  categories: string[];
  data: InterviewQData;
};

type InterviewQuestion = InterviewQData[string]["questions"][number];

function InterviewQuestionItem({
  cat,
  question,
  index,
  level,
  lang,
}: {
  cat: string;
  question: InterviewQuestion;
  index: number;
  level: InterviewLevel;
  lang: Locale;
}) {
  const [open, setOpen] = useState(false);
  const answer = buildInterviewAnswerLevels(question.answer)[level];

  return (
    <details class="iq-item" onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}>
      <summary class="iq-summary">
        <span class="iq-number">{index + 1}</span>
        <span class="iq-cat-badge">{cat}</span>
        <span class="iq-q-title">{question.title}</span>
      </summary>
      {open && (
        <div class="iq-answer">
          <p class="iq-answer-level">
            {t("interviewQA.answer", lang)} · {t(`interviewQA.level.${level}`, lang)}
          </p>
          <div class="iq-answer-body">
            {parseInterviewAnswer(answer).map((block, blockIndex) => {
              if (block.kind === "rule") return <hr class="iq-answer-rule" key={blockIndex} />;
              if (block.kind === "heading") return <h3 key={blockIndex}>{block.text}</h3>;
              if (block.kind === "code") {
                return (
                  <div class="iq-code-block" key={blockIndex}>
                    <div class="iq-code-head">
                      <span>{block.language}</span>
                      <span>code</span>
                    </div>
                    <pre class="iq-answer-code" data-language={block.language}>
                      <code>{block.text}</code>
                    </pre>
                  </div>
                );
              }
              return <p key={blockIndex}>{block.text}</p>;
            })}
          </div>
        </div>
      )}
    </details>
  );
}

export default function InterviewQABank({ lang, categories, data }: Props) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<InterviewLevel>("middle");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const result: Array<{ cat: string; question: InterviewQData[string]["questions"][number] }> = [];
    for (const cat of categories) {
      if (activeCategory !== "all" && cat !== activeCategory) continue;
      for (const qn of data[cat].questions) {
        if (q && !qn.title.toLowerCase().includes(q)) continue;
        result.push({ cat, question: qn });
      }
    }
    return result;
  }, [categories, data, activeCategory, search]);

  const totalQ = Object.values(data).reduce((s, c) => s + c.questions.length, 0);

  return (
    <div class="iq-bank">
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

      <div class="iq-levels" role="tablist" aria-label={t("interviewQA.levels", lang)}>
        {INTERVIEW_LEVELS.map((answerLevel) => (
          <button
            type="button"
            role="tab"
            aria-selected={level === answerLevel}
            class={`iq-level ${level === answerLevel ? "on" : ""}`}
            onClick={() => setLevel(answerLevel)}
          >
            {t(`interviewQA.level.${answerLevel}`, lang)}
          </button>
        ))}
      </div>

      <div class="iq-list" aria-label={t("interviewQA.title", lang)}>
        {filtered.length === 0 ? (
          <p class="text-muted">{t("interviewQA.empty", lang)}</p>
        ) : (
          filtered.map(({ cat, question }, index) => (
            <InterviewQuestionItem
              key={question.slug}
              cat={cat}
              question={question}
              index={index}
              level={level}
              lang={lang}
            />
          ))
        )}
      </div>
    </div>
  );
}
