/** Arc between two nodes on one horizontal row: requests (left→right) bow above, replies below. */
export function arcPath(x1: number, x2: number, rowY = 60, lift = 54): string {
  const up = x2 > x1;
  const y = up ? rowY - 14 : rowY + 14;
  const cy = up ? rowY - lift : rowY + lift;
  return `M${x1} ${y} Q${(x1 + x2) / 2} ${cy} ${x2} ${y}`;
}

/** Apex of an arcPath (the point a quadratic Bézier reaches at t = 0.5). */
export function arcApex(x1: number, x2: number, rowY = 60, lift = 54): { x: number; y: number } {
  const up = x2 > x1;
  const y = up ? rowY - 14 : rowY + 14;
  const cy = up ? rowY - lift : rowY + lift;
  return { x: (x1 + x2) / 2, y: (y + cy) / 2 };
}

/** Point at parameter t on an arcPath curve (quadratic Bézier). */
export function arcPoint(x1: number, x2: number, rowY: number, lift: number, t: number): { x: number; y: number } {
  const up = x2 > x1;
  const y = up ? rowY - 14 : rowY + 14;
  const cy = up ? rowY - lift : rowY + lift;
  const cx = (x1 + x2) / 2;
  const u = 1 - t;
  return { x: u * u * x1 + 2 * u * t * cx + t * t * x2, y: u * u * y + 2 * u * t * cy + t * t * y };
}

/** Place one label per arc, sliding along its own curve until it clears every label placed before. */
export function placeAlongArcs(
  arcs: { x1: number; x2: number; lift: number; loop?: boolean }[],
  rowY: number,
  minGap: number,
  obstacles: { x: number; y: number }[] = [],
): { x: number; y: number }[] {
  const placed: { x: number; y: number }[] = [...obstacles];
  const TS = [0.5, 0.36, 0.64, 0.24, 0.76, 0.14, 0.86];
  for (const a of arcs) {
    const cands = a.loop ? [{ x: a.x1, y: rowY - 40 }] : TS.map((t) => arcPoint(a.x1, a.x2, rowY, a.lift, t));
    const free = cands.find((c) => placed.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= minGap));
    placed.push(free ?? cands[0]);
  }
  return placed.slice(obstacles.length);
}
