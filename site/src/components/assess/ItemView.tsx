// site/src/components/assess/ItemView.tsx
// Renders one AssessItem by kind and reports the answer back up. The three
// controls every kind must offer (spec, task-12-brief): a kind-specific submit
// (inside the body below), "I don't know" (always reachable, no guessing
// required), and "Finish" (stop the session at any point, mid-item).
//
// AssessFlow.tsx mounts this with `key={item.id}` so every new item is a fresh
// mount — local state here (the draft answer, the served-at clock, hint reveal)
// never leaks from one item to the next.
import { useState } from "preact/hooks";
import { t, type Locale } from "~/i18n";
import type { AssessItem, AssessResponse, Outcome } from "~/scripts/assess/types";
import type { ResponseMeta } from "~/scripts/assess/update";
import { useItemContent } from "./item-content";
import { KindMismatch, McqBody, PredictBody, ExplainBody, ReviewBody, tt } from "./item-bodies";
import { DebugBody, ExecBody } from "./item-bodies-code";

type Props = {
  lang: Locale;
  item: AssessItem;
  hintsUsed: 0 | 1 | 2;
  onHint: () => void;
  onAnswer: (response: AssessResponse, meta?: ResponseMeta) => void;
  onStop: () => void;
};

export default function ItemView({ lang, item, hintsUsed, onHint, onAnswer, onStop }: Props) {
  // Captured once at mount — the clock the pure core deliberately does not own.
  const [servedAtMs] = useState(() => Date.now());
  const content = useItemContent(item);

  const submit = (outcome: Outcome, meta?: ResponseMeta) => {
    onAnswer({ outcome, hintsUsed, elapsedMs: Date.now() - servedAtMs }, meta);
  };
  const dontKnow = () => submit("dont_know");

  return (
    <article class="assess-item" data-kind={item.kind}>
      {content === "loading" && <p class="assess-loading">{t("assess.item.loading", lang)}</p>}
      {content === null && <KindMismatch lang={lang} />}
      {content && content !== "loading" && (
        <>
          <p class="assess-item-title">{tt(lang, content.title.en, content.title.ru)}</p>
          <div class="assess-prompt prose assess-prose" dangerouslySetInnerHTML={{ __html: tt(lang, content.prompt.en, content.prompt.ru) }} />
          {item.kind === "mcq" && <McqBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "predict" && <PredictBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "explain" && <ExplainBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "review" && <ReviewBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "debug" && <DebugBody lang={lang} task={content} hintsUsed={hintsUsed} onHint={onHint} onSubmit={submit} />}
          {item.kind === "exec" && <ExecBody lang={lang} task={content} onSubmit={submit} />}
        </>
      )}

      <div class="assess-item-controls">
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={dontKnow}>
          {t("assess.item.dontKnow", lang)}
        </button>
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={onStop}>
          {t("assess.item.finish", lang)}
        </button>
      </div>
    </article>
  );
}
