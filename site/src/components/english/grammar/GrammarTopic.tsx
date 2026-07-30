// GrammarTopic — the study screen for one topic, per CEFR level. RU teaching
// prose is primary (gold); the topic animation sits up top as a framed plate.
// "Practise this topic" swaps in the embedded GrammarPractice runner.
import { useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Bi } from "~/english/types";
import type { Cefr, GrammarFamily, GrammarTopic as Topic } from "~/english/grammar-types";
import { resolveAnimation } from "~/english/animations/archetype-map";
import { GrammarDiagram } from "~/components/english/GrammarDiagram";
import { englishState, getPlacement, grammarCardOf } from "~/english/state";
import { familyHue, isLevelLocked, masteryView } from "./ui";
import { gt, masteryStateLabel } from "./strings";
import { MasteryRing } from "./MasteryRing";
import GrammarPractice, { type CrossSpec } from "./GrammarPractice";
import { Prose } from "./Prose";

export type RelatedTopic = { id: string; title: Bi; family: GrammarFamily };

type Props = {
  lang: Locale;
  topic: Topic;
  familyTitle: Bi;
  related: RelatedTopic[];
  crossSpecs: CrossSpec[];
  byok?: boolean;
};

function prefersReduced(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function GrammarTopic({ lang, topic, familyTitle, related, crossSpecs, byok = false }: Props) {
  englishState.value; // subscribe
  const band = getPlacement()?.band;
  const hue = familyHue(topic.family);
  const now = Date.now();

  const openLevels = topic.levels.filter((lv) => !isLevelLocked(lv, band));
  const firstOpen = openLevels[0] ?? topic.levels[0];
  const [level, setLevel] = useState<Cefr>(firstOpen);
  const [view, setView] = useState<"study" | "practice">("study");

  // Prefer the selected level; fall back to the first OPEN level (never a locked
  // one), then any authored lesson, so the prose never mismatches the selector.
  const lesson = topic.lessons[level] ?? topic.lessons[firstOpen] ?? Object.values(topic.lessons)[0];
  const levelLocked = isLevelLocked(level, band);
  const reduced = prefersReduced();

  // Resolve the editorial Scene factory (stable per topic+lang).
  const scene = useMemo(() => resolveAnimation(topic, lang)?.scene() ?? null, [topic.id, lang]);

  const mv = masteryView(grammarCardOf(topic.id), now);
  const dueLabel =
    mv.dueDays === null ? "" : mv.dueDays <= 0 ? gt("due_today", lang) : gt("due_soon", lang).replace("{n}", String(mv.dueDays));

  if (view === "practice" && topic.gen) {
    return (
      <div class="gsurface">
        <div class="topic-page">
          <div class="g-toolbar">
            <a href="#" onClick={(e) => { e.preventDefault(); setView("study"); }}>{gt("prac_exit", lang)}</a>
          </div>
          <GrammarPractice
            lang={lang}
            topicId={topic.id}
            title={topic.title}
            cefr={level}
            hue={hue}
            spec={topic.gen}
            level={level}
            crossSpecs={crossSpecs}
            byok={byok}
            onExit={() => setView("study")}
          />
        </div>
      </div>
    );
  }

  return (
    <div class="gsurface">
      <div class="topic-page">
        {/* header */}
        <div class="topic-head">
          <div class="gcrumb">
            <a href={`/${lang}/english/grammar`}>{gt("crumb_grammar", lang)}</a>
            <span class="sep">/</span>
            <span>{familyTitle[lang]}</span>
          </div>
          <h1 class="topic-title">
            {topic.title[lang]}
            {lang === "ru" && topic.title.en !== topic.title.ru && <span class="tt-sub">{topic.title.en}</span>}
          </h1>
          <div class="th-top">
            <span class="domain-tag" style={{ "--d": hue }}><span class="sq" />{familyTitle[lang]}</span>
            <div class="level-seg" role="group" aria-label={lang === "en" ? "CEFR level" : "Уровень CEFR"}>
              {topic.levels.map((lv) => {
                const locked = isLevelLocked(lv, band);
                return (
                  <button
                    key={lv}
                    type="button"
                    class={locked ? "locked" : ""}
                    aria-pressed={lv === level}
                    disabled={locked}
                    onClick={() => !locked && setLevel(lv)}
                  >
                    {lv}
                    {locked && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <rect x="5" y="11" width="14" height="9" rx="1.5" /><path d="M8 11V7.5a4 4 0 018 0V11" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {levelLocked && (
          <div class="callout misconception" style={{ marginBottom: "var(--s-5)", flexDirection: "row", alignItems: "center", gap: "var(--s-3)" }}>
            <div style={{ flex: 1 }}>
              <span class="co-label">{gt("placement_required", lang)}</span>
              <p>{gt("level_locked", lang)}</p>
            </div>
            <a class="btn btn-secondary btn-sm" href={`/${lang}/english/`}>{gt("take_placement", lang)}</a>
          </div>
        )}

        <div class="topic-grid">
          {/* main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-5)" }}>
            <figure class="plate" style={{ margin: 0 }}>
              <div class="plate-frame">
                {reduced && (
                  <span class="rm-note">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
                    {gt("reduced_motion", lang)}
                  </span>
                )}
                {scene ? (
                  <GrammarDiagram scene={scene} reducedMotion={reduced} label={topic.title[lang]} />
                ) : (
                  <div class="contour-field" />
                )}
              </div>
              <figcaption class="plate-caption">
                <span class="pc-fig">{gt("plate_fig", lang)} · {topic.archetype}</span>
                <span class="pc-text">{gt("plate_text", lang)}</span>
              </figcaption>
            </figure>

            {lesson && (
              <>
                {/* teaching prose — RU primary, EN secondary */}
                <div class="teach">
                  <div class="teach-block">
                    <span class="prose-label"><span class="pl-gold">◆</span>{gt("explain_primary", lang)}</span>
                    <div class="prose-primary"><Prose md={lesson.explain.ru} /></div>
                  </div>
                  {lesson.explain.en && (
                    <div class="teach-block">
                      <div class="prose-secondary">
                        <span class="ps-tag">{gt("explain_secondary", lang)}</span>
                        <Prose md={lesson.explain.en} />
                      </div>
                    </div>
                  )}
                </div>

                <div class="rule-named">
                  <div class="rn-label">{gt("structure_label", lang)}</div>
                  <div class="rn-formula">{lesson.structure[lang]}</div>
                </div>

                <div>
                  <div class="rn-label" style={{ marginBottom: "var(--s-2)" }}>{gt("examples_label", lang)}</div>
                  <div class="examples">
                    {lesson.examples.map((ex, i) => (
                      <div class="example" key={i}>
                        {/* authored content (not user input) — the only HTML is <b> emphasis */}
                        <span class="ex-en" dangerouslySetInnerHTML={{ __html: ex.en }} />
                        <span class="ex-ru">{ex.ru}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {lesson.pitfalls?.map((pf, i) => (
                  <div class="pitfall" key={i}>
                    <span class="pf-label">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l9 16H3z" /><path d="M12 10v4M12 17v.5" /></svg>
                      {gt("pitfall_label", lang)}
                    </span>
                    <div class="pf-row wrong">
                      <span class="pf-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 6l12 12M18 6L6 18" /></svg></span>
                      <span class="pf-text">{pf.wrong}</span>
                    </div>
                    <div class="pf-row right">
                      <span class="pf-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5" /></svg></span>
                      <span class="pf-text">{pf.right}</span>
                    </div>
                    <p class="pf-why"><b>{gt("pitfall_why", lang)}.</b> {pf.why[lang]}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* side rail */}
          <aside class="topic-rail">
            {topic.gen && !levelLocked && (
              <div class="practice-cta">
                <span class="kicker">{gt("practice_this", lang)}</span>
                <span class="pca-num">100+ <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>{gt("items_ready", lang)}</span></span>
                {lesson?.tip && <span class="pca-line">{lesson.tip[lang]}</span>}
                <button type="button" class="btn btn-primary" style={{ justifyContent: "center" }} onClick={() => setView("practice")}>
                  <span>{gt("practice_this", lang)}</span><span class="arrow">→</span>
                </button>
              </div>
            )}

            <div class="topic-mastery-card">
              <div class="tmc-head"><span class="tmc-label">{gt("mastery_label", lang)}</span></div>
              <div class="tmc-strength">
                <span class="tmc-ring"><MasteryRing state={mv.state} strength={mv.strength} hue={hue} size={44} stroke={3.5} /></span>
                <div class="tmc-meta">
                  <span class="tmc-state">{masteryStateLabel(mv.state, lang)} · {mv.strength}</span>
                  {dueLabel && <span class="tmc-due">{gt("due_in", lang)} · {dueLabel}</span>}
                </div>
              </div>
              <div class="mastery-track" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <i key={i} class={i < Math.round(mv.strength / 12.5) ? "on" : ""} style={{ "--fam": hue }} />
                ))}
              </div>
            </div>

            {related.length > 0 && (
              <div class="confusables">
                <span class="cf-label">{gt("confusables_label", lang)}</span>
                <div class="cf-links">
                  {related.map((r) => (
                    <a class="cf-link" key={r.id} style={{ "--fam": familyHue(r.family) }} href={`/${lang}/english/grammar/${r.id}`}>
                      <span class="sq" />
                      <span class="cf-name">{r.title[lang]}</span>
                      <span class="cf-arrow">→</span>
                    </a>
                  ))}
                </div>
                <p class="cf-contrast">
                  <b>{gt("contrast_with", lang)}:</b> {related[0].title[lang]}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
