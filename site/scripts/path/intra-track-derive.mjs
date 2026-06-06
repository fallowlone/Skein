// Derive intra-track concept→concept prerequisite edges from lesson `prereqs` (sibling lesson
// slugs within a unit). Pure & deterministic — no I/O, no clock. Each lesson L's NEWLY-introduced
// concepts require the ANCHOR concept of each resolved prereq lesson P (anchor = first concept
// first-introduced in P; fallback P.concepts[0]). An edge c→a is emitted only when a's first
// lesson is strictly earlier than L in the stable lesson sequence (cycle-safe). Intra-track is
// guaranteed because prereqs resolve to siblings in the same unit (hence same track).
//
// Input `unitList`: iterable of { id, track, order, unitSlug, lessons: [{ slug, concepts, prereqs }] }.
// Returns { edges: [{concept, requires, via, track}] sorted, warnings: string[] }.
export function deriveIntraTrackEdges(unitList) {
  const units = [...unitList];
  const warnings = [];

  // Flatten to lessons with a stable per-unit index (lessons sorted by slug within a unit).
  const lessons = [];
  for (const u of units) {
    const sorted = [...u.lessons].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
    sorted.forEach((l, idx) => lessons.push({
      unitId: u.id,
      track: u.track,
      slug: l.slug,
      idx,
      order: Number(u.order ?? 999),
      concepts: l.concepts ?? [],
      prereqs: l.prereqs ?? [],
    }));
  }

  const seqOf = (l) => l.order * 1000 + l.idx;
  // strict ordering: seq, then unit id, then slug (deterministic across cross-track seq collisions).
  const earlier = (a, b) => {
    const sa = seqOf(a), sb = seqOf(b);
    if (sa !== sb) return sa - sb;
    if (a.unitId !== b.unitId) return a.unitId < b.unitId ? -1 : 1;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  };

  // firstLesson(concept) = earliest lesson (by `earlier`) teaching it.
  const firstLesson = new Map();
  for (const l of lessons) for (const c of l.concepts) {
    const cur = firstLesson.get(c);
    if (!cur || earlier(l, cur) < 0) firstLesson.set(c, l);
  }
  const isNewIn = (c, l) => firstLesson.get(c) === l;

  // anchor(lesson) = first concept first-introduced in it; fallback to first listed concept.
  const anchorOf = (l) => {
    for (const c of l.concepts) if (isNewIn(c, l)) return c;
    return l.concepts[0] ?? null;
  };

  // sibling lookup by slug within a unit.
  const byUnit = new Map();
  for (const l of lessons) {
    if (!byUnit.has(l.unitId)) byUnit.set(l.unitId, new Map());
    byUnit.get(l.unitId).set(l.slug, l);
  }

  const edges = [];
  const seen = new Set();
  for (const L of lessons) {
    if (!L.prereqs.length) continue;
    const newCs = L.concepts.filter((c) => isNewIn(c, L));
    if (!newCs.length) continue;
    for (const pslug of L.prereqs) {
      const P = byUnit.get(L.unitId)?.get(pslug);
      if (!P) { warnings.push(`intra-track-derive: ${L.unitId}/${L.slug} prereq "${pslug}" not a sibling lesson; skipped`); continue; }
      const a = anchorOf(P);
      if (!a) continue;
      const aFirst = firstLesson.get(a);
      if (!aFirst || earlier(aFirst, L) >= 0) continue; // anchor not strictly earlier → would risk a cycle
      for (const c of newCs) {
        if (c === a) continue;
        const k = `${c}|${a}`;
        if (seen.has(k)) continue;
        seen.add(k);
        edges.push({ concept: c, requires: a, via: `${L.slug}<-${P.slug}`, track: L.track });
      }
    }
  }

  edges.sort((x, y) => (x.concept < y.concept ? -1 : x.concept > y.concept ? 1 : x.requires < y.requires ? -1 : x.requires > y.requires ? 1 : 0));
  return { edges, warnings };
}
