export type RawNode = { id: string; label: string; col?: number; row?: number; sub?: string };
export type PlacedNode = { id: string; label: string; col: number; row: number; sub?: string };

/** Auto-place nodes left-to-right, wrapping every `perRow`, unless col/row are explicit. */
export function placeNodes(nodes: RawNode[], perRow: number): PlacedNode[] {
  let auto = 0;
  return nodes.map((n) => {
    if (n.col != null && n.row != null) return { ...n, col: n.col, row: n.row };
    const col = auto % perRow;
    const row = Math.floor(auto / perRow);
    auto++;
    return { ...n, col, row };
  });
}

// Approximate per-character advance widths for the two text styles used in the
// node boxes. Body text at 12.5px averages ~6.9px; the mono sub at 10px is a
// fixed ~6.2px. SVG has no layout engine at build time, so estimation is the
// only option — values err slightly wide so text never clips.
export const LABEL_CHAR_W = 6.9;
export const SUB_CHAR_W = 6.2;
const PAD_X = 14;

// Mid-token break points for subs without spaces ("a·b·c", "x/y", "a→b").
const BREAKABLE = /[·\/,;→|-]/;

/**
 * Split a sub into two lines at the break point (space, or a separator char)
 * that minimises the longer line. Hard-splits at the midpoint when the string
 * has no break points at all.
 */
function bestSplit(sub: string): [string, string] {
  const candidates: number[] = [];
  for (let i = 1; i < sub.length; i++) {
    if (sub[i] === " " || BREAKABLE.test(sub[i - 1])) candidates.push(i);
  }
  if (candidates.length === 0) {
    const mid = Math.ceil(sub.length / 2);
    return [sub.slice(0, mid), sub.slice(mid)];
  }
  let best = candidates[0], bestCost = Infinity;
  for (const c of candidates) {
    const cost = Math.max(sub.slice(0, c).trimEnd().length, sub.slice(c).trimStart().length);
    if (cost < bestCost) { bestCost = cost; best = c; }
  }
  return [sub.slice(0, best).trimEnd(), sub.slice(best).trimStart()];
}

/**
 * Per-diagram column width: wide enough for the longest node label, and for
 * each sub either on one line or split across two (sized for the actual wrap
 * result, so fitColumnWidth and wrapSub agree). Clamped to [base, max] so
 * short diagrams keep the compact 130px box and long ones never blow up the
 * viewBox (the svg scales to fit, so an oversized width shrinks all text).
 */
export function fitColumnWidth(nodes: RawNode[], base = 130, max = 170): number {
  let need = base;
  for (const n of nodes) {
    need = Math.max(need, n.label.length * LABEL_CHAR_W + PAD_X);
    if (n.sub) {
      const oneLine = n.sub.length * SUB_CHAR_W + PAD_X;
      if (oneLine <= max) {
        need = Math.max(need, oneLine);
      } else {
        const [l1, l2] = bestSplit(n.sub);
        need = Math.max(need, Math.max(l1.length, l2.length) * SUB_CHAR_W + PAD_X);
      }
    }
  }
  // ceil (not round) so subBudget's floor division inverts to ≥ the line length.
  return Math.ceil(Math.min(max, need));
}

/** How many sub characters fit on one line inside a box of width `cw`. */
export function subBudget(cw: number): number {
  return Math.floor((cw - PAD_X) / SUB_CHAR_W);
}

/**
 * Wrap a sub label into at most two lines of ≤ `budget` chars, using the same
 * split as fitColumnWidth. Lines only overflow when the box is clamped at its
 * max width — those are ellipsised, never allowed to escape the box.
 */
export function wrapSub(sub: string, budget: number): string[] {
  if (sub.length <= budget) return [sub];
  const clamp = (line: string) =>
    line.length > budget ? line.slice(0, Math.max(1, budget - 1)).trimEnd() + "…" : line;
  const [l1, l2] = bestSplit(sub);
  return [clamp(l1), clamp(l2)];
}
