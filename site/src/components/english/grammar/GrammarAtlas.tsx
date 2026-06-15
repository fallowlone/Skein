// GrammarAtlas — the browse/entry showcase. Families are tinted map regions
// (Layout A); topics are compact entries with a calm mastery ring. Filters by
// CEFR band + family + free text. Mounted client:visible on the grammar route.
import { useMemo, useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { Bi } from "~/english/types";
import type { Cefr, GrammarFamily } from "~/english/grammar-types";
import { cefrIndex } from "~/english/grammar-types";
import { FAMILIES } from "~/english/data/grammar/families";
import { englishState, getPlacement, grammarCardOf } from "~/english/state";
import { gt } from "./strings";
import { BANDS, familyHue, familyNote, isLevelLocked, masteryView } from "./ui";
import { MasteryRing, CefrBadges, LockGlyph } from "./MasteryRing";

export type AtlasTopic = {
  id: string;
  title: Bi;
  cefr: Cefr;
  levels: Cefr[];
  family: GrammarFamily;
};

type Props = { lang: Locale; topics: AtlasTopic[] };

export default function GrammarAtlas({ lang, topics }: Props) {
  englishState.value; // subscribe to mastery/placement changes
  const band = getPlacement()?.band;
  const now = Date.now();

  const [query, setQuery] = useState("");
  const [filterBand, setFilterBand] = useState<Cefr | null>(null);
  const [filterFam, setFilterFam] = useState<GrammarFamily | null>(null);

  const q = query.trim().toLowerCase();
  const mastered = useMemo(
    () => topics.filter((t) => masteryView(grammarCardOf(t.id), now).state === "mature").length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topics, englishState.value, now],
  );

  const matches = (t: AtlasTopic): boolean => {
    if (filterBand && t.cefr !== filterBand) return false;
    if (!q) return true;
    return (
      t.title.en.toLowerCase().includes(q) ||
      t.title.ru.toLowerCase().includes(q) ||
      t.id.includes(q)
    );
  };

  const regions = FAMILIES.filter((f) => !filterFam || f.id === filterFam)
    .map((f) => ({
      family: f,
      topics: topics
        .filter((t) => t.family === f.id && matches(t))
        .sort((a, b) => cefrIndex(a.cefr) - cefrIndex(b.cefr) || a.title.en.localeCompare(b.title.en)),
    }))
    .filter((r) => r.topics.length > 0);

  const clearFilters = () => { setQuery(""); setFilterBand(null); setFilterFam(null); };

  return (
    <div class="gsurface">
      <div class="gpage">
        {/* masthead */}
        <div class="atlas-masthead">
          <div class="contour-field" />
          <div class="gcrumb">
            <a href={`/${lang}/english/`}>{gt("nav_english", lang)}</a>
            <span class="sep">/</span>
            <span>{gt("crumb_grammar", lang)}</span>
          </div>
          <h1 class="atlas-title">
            {gt("atlas_title_a", lang)} <em>{gt("atlas_title_b", lang)}</em>
          </h1>
          <p class="atlas-lede">{gt("atlas_lede", lang)}</p>
          <div class="atlas-stats">
            <span class="as"><b>{topics.length}</b><span>{gt("stat_topics", lang)}</span></span>
            <span class="as"><b>{FAMILIES.length}</b><span>{gt("stat_families", lang)}</span></span>
            <span class="as"><b>{mastered}</b><span>{gt("stat_mastered", lang)}</span></span>
          </div>
        </div>

        {/* controls */}
        <div class="atlas-controls">
          <label class="atlas-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" />
            </svg>
            <input
              type="search"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
              placeholder={gt("search_ph", lang)}
              aria-label={gt("search_ph", lang)}
            />
          </label>
          <div class="ctrl-group">
            <span class="ctrl-label">{gt("filter_band", lang)}</span>
            <div class="band-filter" role="group" aria-label={gt("filter_band", lang)}>
              <button type="button" class="band-pill" aria-pressed={!filterBand} onClick={() => setFilterBand(null)}>
                {gt("all", lang)}
              </button>
              {BANDS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  class={"band-pill" + (b.locked ? " locked-band" : "")}
                  aria-pressed={filterBand === b.id}
                  onClick={() => setFilterBand(filterBand === b.id ? null : b.id)}
                >
                  {b.id}
                </button>
              ))}
            </div>
          </div>
          <div class="ctrl-group" style={{ flexBasis: "100%" }}>
            <span class="ctrl-label">{gt("filter_family", lang)}</span>
            <div class="fam-filter">
              {FAMILIES.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  class="fam-chip"
                  style={{ "--fam": familyHue(f.id) }}
                  aria-pressed={filterFam === f.id}
                  onClick={() => setFilterFam(filterFam === f.id ? null : f.id)}
                >
                  <span class="sq" />{f.title[lang]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* spread or empty */}
        {regions.length === 0 ? (
          <div class="atlas-empty">
            <svg class="ae-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /><path d="M8 11h6" stroke-opacity="0.5" />
            </svg>
            <h3>{gt("empty_title", lang)}</h3>
            <p>{gt("empty_body", lang)}</p>
            <button type="button" class="btn btn-secondary btn-sm" onClick={clearFilters}>{gt("clear_filters", lang)}</button>
          </div>
        ) : (
          <div class="atlas-spread">
            {regions.map((r) => {
              const hue = familyHue(r.family.id);
              return (
                <section class="fam-region" style={{ "--fam": hue }} key={r.family.id}>
                  <div class="fam-region-head">
                    <span class="fr-name">{r.family.title[lang]}</span>
                    <span class="fr-tag"><span class="sq" />{r.family.id}</span>
                  </div>
                  <span class="fr-count">
                    {r.topics.length} {gt("topics_n", lang)} · {familyNote(r.family.id, lang)}
                  </span>
                  <div>
                    {r.topics.map((t) => {
                      const locked = isLevelLocked(t.cefr, band);
                      const mv = masteryView(grammarCardOf(t.id), now);
                      return (
                        <a
                          key={t.id}
                          class={"topic-entry" + (locked ? " locked" : "")}
                          style={{ "--fam": hue }}
                          href={locked ? undefined : `/${lang}/english/grammar/${t.id}`}
                          aria-disabled={locked ? "true" : undefined}
                        >
                          <span class="te-title">{t.title[lang]}</span>
                          <span class="te-mastery">
                            {locked ? <LockGlyph /> : <MasteryRing state={mv.state} strength={mv.strength} hue={hue} />}
                          </span>
                          <span class="te-meta">
                            <CefrBadges cefr={t.cefr} levels={t.levels} hue={hue} />
                            {locked && <span class="lock-hint">{gt("placement_required", lang)}</span>}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
