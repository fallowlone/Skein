export type GridInput = {
  scrollTop: number;
  rowHeight: number;
  viewportH: number;
  total: number;
  overscan: number;
};

export type GridRange = {
  start: number;
  end: number;     // exclusive
  padTop: number;
  padBottom: number;
};

export function visibleRange(input: GridInput): GridRange {
  const { scrollTop, rowHeight, viewportH, total, overscan } = input;

  // Guard: invalid rowHeight produces a degenerate range (no throw, no NaN).
  if (!isFinite(rowHeight) || rowHeight <= 0) {
    return { start: 0, end: 0, padTop: 0, padBottom: 0 };
  }

  const first = Math.floor(scrollTop / rowHeight);
  const start = Math.max(0, first - overscan);
  const visible = Math.ceil(viewportH / rowHeight);
  const end = Math.min(total, first + visible + overscan);

  const padTop = start * rowHeight;
  const padBottom = (total - end) * rowHeight;

  return { start, end, padTop, padBottom };
}
