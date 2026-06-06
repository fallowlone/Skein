// Pure ru-label patcher. Returns { concepts, applied, skipped, warnings }. Never throws.
// Unknown id in the map → warn + skipped; empty/whitespace ru → skipped (label unchanged).
// en is never touched; the input array/objects are not mutated.
export function mergeLabels(concepts, labelMap) {
  const ids = new Set(concepts.map((c) => c.id));
  const warnings = [];
  let skipped = 0;
  for (const id of Object.keys(labelMap ?? {})) {
    if (!ids.has(id)) { skipped++; warnings.push(`labels: unknown id "${id}"`); }
  }
  let applied = 0;
  const out = concepts.map((c) => {
    const ru = labelMap?.[c.id];
    if (typeof ru === "string" && ru.trim()) {
      applied++;
      return { ...c, label: { ...c.label, ru: ru.trim() } };
    }
    return c;
  });
  return { concepts: out, applied, skipped, warnings };
}
