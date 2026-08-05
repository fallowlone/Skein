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
import type { AssessItem, AssessResponse, Cell, CellKey, Level, Outcome } from "~/scripts/assess/types";
import type { ResponseMeta } from "~/scripts/assess/update";
import { keyStatus, withKey } from "~/english/byok";
import { postMessages, type ConverseDeps } from "~/english/byok/converse";
import { getGradingModel } from "~/english/state";
import { MAX_INPUT_CHARS } from "~/scripts/practice-grade-llm";
import { anchorLevel, buildAssessRubric, gradeExplainVerdict, llmAvailable } from "~/scripts/assess/llm-grade";
import { useItemContent } from "./item-content";
import { KindMismatch, RecallBody, PredictBody, ExplainBody, ReviewBody } from "./item-bodies";
import { DebugBody, ExecBody } from "./item-bodies-code";
import { tt } from "./labels";

type Props = {
  lang: Locale;
  item: AssessItem;
  hintsUsed: 0 | 1 | 2;
  onHint: () => void;
  onAnswer: (response: AssessResponse, meta?: ResponseMeta) => void;
  onStop: () => void;
  labelOf: (conceptId: string) => { en: string; ru: string };
  /** Task 13 fix round 1: the session's cells AS OF BEFORE this item's own
   *  response — read-only here, used only to derive the LLM clamp's
   *  deterministic anchor, ONE PER CONCEPT the item touches (fix round 2's
   *  `anchorLevel(conceptId, ...)`, called once per `item.concepts` entry).
   *  Never written to; the engine's own reducer (session.ts) remains the
   *  only writer. */
  cells: ReadonlyMap<CellKey, Cell>;
};

/**
 * Task 13's impure half: the network call, the key lookup, and (via
 * postMessages -> fetch) the clock all live here in the island, never in
 * scripts/assess/llm-grade.ts (Ruling 1). Never throws past this point — a
 * missing key, a locked key, or a failed/unparsable call all fall back to
 * `llmGraded: false` with no verdicts, so the caller keeps the learner's own
 * self-graded Outcome untouched (Ruling 4/6: the LLM layer stays strictly
 * optional, and now genuinely additive rather than a downgrade-only ratchet —
 * see llm-grade.ts's `gradeExplainVerdict` for the ±1 clamp and update.ts for
 * how `verdictLevels` reaches the posterior).
 *
 * Fix round 2 (Critical): the model is called ONCE, but the verdict is
 * clamped ONCE PER CONCEPT, each against that concept's own `anchorLevel` —
 * fix round 1 clamped against `item.concepts[0]` alone while `applyResponse`
 * broadcast the result to every concept the item touches, leaving the ±1
 * bound unenforced for 99.7% of `explain` items (they span 2+ concepts).
 * `gradeExplainVerdict` (the bypass-proof, parse+clamp-in-one-step combinator
 * — see its own doc comment) is called once per `item.concepts` entry;
 * `why` is identical across calls (clamping never touches it), so only the
 * first is kept.
 */
async function gradeExplainAnswer(
  item: AssessItem,
  lang: Locale,
  answerText: string,
  cells: ReadonlyMap<CellKey, Cell>,
  conceptLabel: { en: string; ru: string },
): Promise<{ verdictLevels?: Record<string, Level>; why?: string; llmGraded: boolean }> {
  const status = await keyStatus();
  if (!llmAvailable(status) || answerText.length > MAX_INPUT_CHARS) {
    return { llmGraded: false };
  }
  try {
    const rubric = buildAssessRubric(item, conceptLabel);
    const deps: ConverseDeps = { fetch: fetch.bind(globalThis), withKey, model: getGradingModel() };
    const data = await postMessages(
      {
        model: deps.model,
        max_tokens: 200,
        system: [{ type: "text", text: tt(lang, rubric.en, rubric.ru), cache_control: { type: "ephemeral" } }],
        messages: [{
          role: "user",
          content: `${tt(lang, "LEARNER'S EXPLANATION:", "ОБЪЯСНЕНИЕ УЧЕНИКА:")}\n${answerText}`,
        }],
      },
      deps,
    );
    const raw = (data?.content?.[0]?.text ?? "") as string;
    const verdictLevels: Record<string, Level> = {};
    let why: string | undefined;
    for (const conceptId of item.concepts) {
      const anchor = anchorLevel(conceptId, item.facet, item.band, cells);
      const verdict = gradeExplainVerdict(raw, anchor);
      if (!verdict) continue; // parsing failed — identical outcome for every concept, see loop below
      verdictLevels[conceptId] = verdict.level;
      why ??= verdict.why;
    }
    // `gradeExplainVerdict`'s parse step doesn't depend on `anchor`, so this
    // is either populated for every concept or for none — checking emptiness
    // here (rather than bailing after the first null) keeps the loop body
    // simple and is not a security-relevant distinction either way.
    if (Object.keys(verdictLevels).length === 0) return { llmGraded: false };
    return { verdictLevels, why, llmGraded: true };
  } catch {
    return { llmGraded: false };
  }
}

export default function ItemView({ lang, item, hintsUsed, onHint, onAnswer, onStop, labelOf, cells }: Props) {
  // Captured once at mount — the clock the pure core deliberately does not own.
  const [servedAtMs] = useState(() => Date.now());
  const [grading, setGrading] = useState(false);
  const content = useItemContent(item);

  const finalize = (outcome: Outcome, meta?: ResponseMeta) => {
    onAnswer({ outcome, hintsUsed, elapsedMs: Date.now() - servedAtMs }, meta);
  };

  // explain items get an optional BYOK check on top of the self-grade already
  // baked into item-bodies.tsx's CommitRevealBody (Ruling 4's "deterministic
  // path"): with no key, this is a no-op passthrough to the exact pre-Task-13
  // behaviour. With a key, the learner's own FULL draft (meta.rawAnswer — the
  // untruncated text; item-bodies.tsx's DIGEST_MAX=240 truncation of
  // answerDigest is a report-storage cap, not the LLM's input bound, and must
  // not also cap what gets graded) is checked against ASSESS_RUBRIC_EN/RU
  // under gradeExplainAnswer's own MAX_INPUT_CHARS guard, and the per-concept
  // clamped verdict Levels ride along in `meta.llmVerdictLevels`, genuinely
  // moving each concept's own target-facet posterior in update.ts — the
  // self-graded `outcome` itself is never overwritten by the LLM (fix round
  // 1's Critical fix: previously it was, which collapsed "middle" and
  // "senior" into the same recorded Outcome and made the whole layer
  // downgrade-only; fix round 2's Critical fix: fix round 1 then clamped
  // against `concepts[0]` alone while broadcasting the same likelihood
  // factor to every concept the item touches).
  const submit = (outcome: Outcome, meta?: ResponseMeta) => {
    // Ignore re-entrant submits while a previous explain grading is in flight
    // (the self-grade buttons stay mounted during the async gap) — a double
    // click must not record the answer twice.
    if (grading) return;
    // `rawAnswer` is ItemView-local only — it must never reach
    // finalize/onAnswer/Evidence (see update.ts's ResponseMeta doc comment),
    // so it is stripped into `persisted` here, before EITHER branch below.
    const { rawAnswer, ...persisted } = meta ?? {};
    if (item.kind !== "explain" || !rawAnswer || outcome === "dont_know") {
      finalize(outcome, persisted);
      return;
    }
    const conceptLabel = labelOf(item.concepts[0] ?? item.lessonKey);
    setGrading(true);
    void gradeExplainAnswer(item, lang, rawAnswer, cells, conceptLabel)
      .then((graded) => finalize(outcome, {
        ...persisted, failureNote: graded.why, llmGraded: graded.llmGraded, llmVerdictLevels: graded.verdictLevels,
      }))
      .finally(() => setGrading(false));
  };
  const dontKnow = () => submit("dont_know");
  // I2 (task-12-report.md fix round 1): "I don't know" records real Evidence for
  // a question the learner was actually shown — it must not be clickable while
  // the content is still loading, or after it failed to load (404 / a stale
  // taskId). Both would inject false evidence into the measurement this whole
  // feature exists to keep honest. "Finish" has no such risk (it stops the
  // session, it does not answer this item) and stays available throughout —
  // a learner must always be able to leave.
  const loaded = content !== "loading" && content !== null;

  return (
    <article class="assess-item" data-kind={item.kind}>
      {content === "loading" && <p class="assess-loading">{t("assess.item.loading", lang)}</p>}
      {content === null && <KindMismatch lang={lang} />}
      {content && content !== "loading" && (
        <>
          <p class="assess-item-title">{tt(lang, content.title.en, content.title.ru)}</p>
          <div class="assess-prompt prose assess-prose" dangerouslySetInnerHTML={{ __html: tt(lang, content.prompt.en, content.prompt.ru) }} />
          {item.kind === "recall" && <RecallBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "predict" && <PredictBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "explain" && <ExplainBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "review" && <ReviewBody lang={lang} task={content} onSubmit={submit} />}
          {item.kind === "debug" && <DebugBody lang={lang} task={content} hintsUsed={hintsUsed} onHint={onHint} onSubmit={submit} />}
          {item.kind === "exec" && <ExecBody lang={lang} task={content} onSubmit={submit} />}
        </>
      )}

      {grading && <p class="assess-loading">{t("assess.item.grading", lang)}</p>}

      <div class="assess-item-controls">
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={dontKnow} disabled={!loaded || grading} aria-disabled={!loaded || grading}>
          {t("assess.item.dontKnow", lang)}
        </button>
        <button type="button" class="oa-btn oa-btn-ghost oa-btn-sm" onClick={onStop}>
          {t("assess.item.finish", lang)}
        </button>
      </div>
    </article>
  );
}
