import type { JSX } from "preact";

/* Shared animation math + auto-layout SVG pattern renderers for AlgoPoster.
   Each pattern exposes render(data, nSteps) -> static skeleton JSX and
   pose(t, nSteps, data, root) -> per-frame imperative updates.
   t is in step units, 0..nSteps (clamped). Discrete state comes from the
   current step index; only travel (packets, brackets, bubbles, tokens,
   bars, keys, dots) moves continuously. Discrete fills rely on CSS
   transitions (>=0.45s) declared in AlgoPoster styles. */

export const clamp01 = (k: number) => (k < 0 ? 0 : k > 1 ? 1 : k);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const easeInOut = (k: number) => {
  k = clamp01(k);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};
/** Segment progress 0..1 of step s within t (t in step units). */
export const segf = (t: number, s: number) => clamp01(t - s);
export const stepOf = (t: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(t)));

type D = Record<string, any>;
type Root = Element;

function q(root: Root, id: string): Element | null {
  return root.querySelector(`[data-e="${id}"]`);
}
function setFill(root: Root, id: string, fill: string) {
  const el = q(root, id);
  if (el) el.setAttribute("fill", fill);
}
function setOp(root: Root, id: string, op: number) {
  const el = q(root, id);
  if (el) el.setAttribute("opacity", String(op));
}
function setText(root: Root, id: string, s: string) {
  const el = q(root, id);
  if (el) el.textContent = s;
}
function setStroke(root: Root, id: string, c: string, w?: number) {
  const el = q(root, id);
  if (el) {
    el.setAttribute("stroke", c);
    if (w !== undefined) el.setAttribute("stroke-width", String(w));
  }
}
function move(root: Root, id: string, x: number, y: number) {
  const el = q(root, id);
  if (el) el.setAttribute("transform", `translate(${x},${y})`);
}

const INK = "#111";
const PAPER = "#fffdf4";
const GREEN = "#9be15d";
const ORANGE = "#ff9f43";
const YELLOW = "#ffe45e";
const PURPLE = "#7c3aed";
const PINK = "#db2777";
const DIM = "#d9cba6";

export type PatternKind =
  | "lane"
  | "bars"
  | "halving"
  | "stack"
  | "tree"
  | "heap"
  | "graph"
  | "grid"
  | "buckets"
  | "choice"
  | "curves"
  | "bits"
  | "pipeline";

/* ---------------- lane: array strip + gliding window bracket ----------------
   data: { cells: string[], wins: [lo,hi][] per step, sums?: string[] per step,
           lo?: string, hi?: string (pointer names), note?: string } */
function laneLayout(n: number) {
  const cellW = Math.min(84, (880 - (n - 1) * 8) / n);
  const total = n * cellW + (n - 1) * 8;
  const x0 = (980 - total) / 2;
  return { cellW, x0, y: 168, h: 54 };
}

const lane = {
  render(data: D) {
    const cells: string[] = data.cells;
    const n = cells.length;
    const { cellW, x0, y, h } = laneLayout(n);
    const cx = (i: number) => x0 + i * (cellW + 8);
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        <g data-e="sumchip">
          <rect x="330" y="66" width="320" height="26" rx="13" fill={PAPER} stroke={INK} stroke-width="2" />
          <text data-e="sumtext" x="490" y="84" text-anchor="middle" font-size="12" font-weight="700" />
        </g>
        {cells.map((c, i) => (
          <g key={i}>
            <text x={cx(i) + cellW / 2} y={y - 14} text-anchor="middle" font-size="14" font-weight="700" data-e={`v${i}`}>
              {c}
            </text>
            <rect
              data-e={`c${i}`}
              x={cx(i)}
              y={y}
              width={cellW}
              height={h}
              rx="6"
              fill={PAPER}
              stroke={INK}
              stroke-width="2.5"
              class="ap-xfade"
            />
            <text x={cx(i) + cellW / 2} y={y + h + 22} text-anchor="middle" font-size="11" fill="#555">
              {i}
            </text>
          </g>
        ))}
        <rect data-e="bracket" x={x0 - 6} y={y - 8} width={cellW + 12} height={h + 16} rx="10" fill="none" stroke={INK} stroke-width="3" stroke-dasharray="10 6" class="ap-flow" />
        <g data-e="plo">
          <text data-e="plotext" x="0" y="24" text-anchor="middle" font-size="12" font-weight="700" fill={INK}>
            {data.lo ?? "left"}
          </text>
          <path data-e="ploarrow" d="M0 0 L0 -14" stroke={INK} stroke-width="2.5" />
        </g>
        <g data-e="phi">
          <text data-e="phitext" x="0" y="24" text-anchor="middle" font-size="12" font-weight="700" fill={INK}>
            {data.hi ?? "right"}
          </text>
          <path d="M0 0 L0 -14" stroke={INK} stroke-width="2.5" />
        </g>
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const cells: string[] = data.cells;
    const m = cells.length;
    const { cellW, x0, y, h } = laneLayout(m);
    const cx = (i: number) => x0 + i * (cellW + 8);
    const wins: [number, number][] = data.wins;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = wins[Math.min(s, wins.length - 1)];
    const nxt = wins[Math.min(s + 1, wins.length - 1)];
    const lo = lerp(cur[0], nxt[0], f);
    const hi = lerp(cur[1], nxt[1], f);
    const bx = x0 + lo * (cellW + 8) - 6;
    const bw = (hi - lo + 1) * cellW + (hi - lo) * 8 + 12;
    const br = q(root, "bracket");
    if (br) {
      br.setAttribute("x", String(bx));
      br.setAttribute("width", String(Math.max(bw, 20)));
    }
    for (let i = 0; i < m; i++) {
      const inside = i + 0.001 >= Math.floor(lo + 0.001) && i <= Math.ceil(hi - 0.001) + 0.001;
      const inLo = i >= Math.floor(lo + 0.5) && i <= Math.ceil(hi - 0.5);
      setFill(root, `c${i}`, inLo ? "#e9fbe7" : PAPER);
      setOp(root, `v${i}`, 1);
      void inside;
    }
    move(root, "plo", cx(Math.round(lo)) + cellW / 2, y + h + 30);
    move(root, "phi", cx(Math.round(hi)) + cellW / 2, y + h + 30);
    if (data.sums) setText(root, "sumtext", data.sums[Math.min(s, data.sums.length - 1)] ?? "");
    else setOp(root, "sumchip", 0);
  },
};

/* ---------------- bars: compare / swap row ----------------
   data: { values: number[], orders: number[][] per step, hi?: number[][] per step,
           done?: number[] per step, labels?: string[] } */
const bars = {
  render(data: D) {
    const vals: number[] = data.values;
    const n = vals.length;
    const max = Math.max(...vals);
    const bw = Math.min(64, (860 - (n - 1) * 10) / n);
    const total = n * bw + (n - 1) * 10;
    const x0 = (980 - total) / 2;
    const base = 300;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {vals.map((v, i) => (
          <g key={i} data-e={`bar${i}`}>
            <text data-e={`bv${i}`} x="0" y={-(v / max) * 190 - 10} text-anchor="middle" font-size="13" font-weight="700">
              {String(v)}
            </text>
            <rect
              data-e={`br${i}`}
              x={-bw / 2}
              y={-(v / max) * 190}
              width={bw}
              height={(v / max) * 190}
              fill={PAPER}
              stroke={INK}
              stroke-width="2.5"
              class="ap-xfade"
            />
            <text x="0" y="22" text-anchor="middle" font-size="10" fill="#555" data-e={`bl${i}`}>
              {(data.labels ?? [])[i] ?? ""}
            </text>
          </g>
        ))}
        <line x1={x0 - 20} y1={base} x2={x0 + total + 20} y2={base} stroke={INK} stroke-width="3" />
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const vals: number[] = data.values;
    const m = vals.length;
    const bw = Math.min(64, (860 - (m - 1) * 10) / m);
    const total = m * bw + (m - 1) * 10;
    const x0 = (980 - total) / 2;
    const base = 300;
    const orders: number[][] = data.orders;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = orders[Math.min(s, orders.length - 1)];
    const nxt = orders[Math.min(s + 1, orders.length - 1)];
    const posCur = new Array(m).fill(0);
    const posNxt = new Array(m).fill(0);
    cur.forEach((id, p) => (posCur[id] = p));
    nxt.forEach((id, p) => (posNxt[id] = p));
    const hi: number[] = (data.hi ?? [])[Math.min(s, (data.hi ?? []).length - 1)] ?? [];
    const done: number = (data.done ?? [])[Math.min(s, (data.done ?? []).length - 1)] ?? 0;
    for (let i = 0; i < m; i++) {
      const p = lerp(posCur[i], posNxt[i], f);
      move(root, `bar${i}`, x0 + p * (bw + 10) + bw / 2, base);
      const isHi = hi.includes(i);
      const isDone = posCur[i] >= m - done && done > 0;
      setFill(root, `br${i}`, isHi ? YELLOW : isDone ? "#e9fbe7" : PAPER);
      setStroke(root, `br${i}`, INK, isHi ? 3.5 : 2.5);
    }
  },
};

/* ---------------- halving: shrinking interval over sorted strip ----------------
   data: { cells: string[], ranges: [lo,hi][] per step, target: number, title?, note? } */
const halving = {
  render(data: D) {
    const cells: string[] = data.cells;
    const m = cells.length;
    const cellW = Math.min(72, (880 - (m - 1) * 8) / m);
    const total = m * cellW + (m - 1) * 8;
    const x0 = (980 - total) / 2;
    const y = 170;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {cells.map((c, i) => (
          <g key={i}>
            <text x={x0 + i * (cellW + 8) + cellW / 2} y={y - 14} text-anchor="middle" font-size="14" font-weight="700">
              {c}
            </text>
            <rect data-e={`h${i}`} x={x0 + i * (cellW + 8)} y={y} width={cellW} height="52" rx="6" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={x0 + i * (cellW + 8) + cellW / 2} y={y + 74} text-anchor="middle" font-size="11" fill="#555">
              {i}
            </text>
          </g>
        ))}
        <rect data-e="hbracket" x={x0 - 6} y={y - 8} width={total + 12} height="68" rx="10" fill="none" stroke={PURPLE} stroke-width="3.5" />
        <g data-e="hmid">
          <path d="M0 0 L-9 -14 L9 -14 Z" fill={ORANGE} stroke={INK} stroke-width="2" />
          <text data-e="hmidtext" x="0" y="-20" text-anchor="middle" font-size="11" font-weight="700">
            mid
          </text>
        </g>
        <g data-e="htarget">
          <path d="M0 0 L0 -18" stroke={PINK} stroke-width="3" stroke-dasharray="5 4" class="ap-flow" />
          <text data-e="htargettext" x="0" y="118" text-anchor="middle" font-size="11" font-weight="700" fill={PINK}>
            ★
          </text>
        </g>
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const cells: string[] = data.cells;
    const m = cells.length;
    const cellW = Math.min(72, (880 - (m - 1) * 8) / m);
    const x0 = (980 - (m * cellW + (m - 1) * 8)) / 2;
    const y = 170;
    const ranges: [number, number][] = data.ranges;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = ranges[Math.min(s, ranges.length - 1)];
    const nxt = ranges[Math.min(s + 1, ranges.length - 1)];
    const lo = lerp(cur[0], nxt[0], f);
    const hi = lerp(cur[1], nxt[1], f);
    const br = q(root, "hbracket");
    if (br) {
      br.setAttribute("x", String(x0 + lo * (cellW + 8) - 6));
      br.setAttribute("width", String(Math.max((hi - lo + 1) * cellW + (hi - lo) * 8 + 12, 20)));
    }
    const mid = Math.floor((Math.round(lo) + Math.round(hi)) / 2);
    move(root, "hmid", x0 + mid * (cellW + 8) + cellW / 2, y - 34);
    move(root, "htarget", x0 + (data.target ?? 0) * (cellW + 8) + cellW / 2, y - 6);
    for (let i = 0; i < m; i++) {
      const inR = i >= Math.round(lo) && i <= Math.round(hi);
      const isMid = i === mid && inR;
      const isT = i === data.target;
      setFill(root, `h${i}`, isMid ? YELLOW : isT && !inR ? PAPER : inR ? "#f3e8ff" : "#efe8d2");
      setOp(root, `h${i}`, inR || isT ? 1 : 0.45);
    }
  },
};

/* ---------------- stack: growing / shrinking frames ----------------
   data: { frames: string[], depths: number[] per step, side?: string[] per step } */
function stackLayout(n: number) {
  const bottom = 302;
  const top = 84;
  const avail = bottom - top;
  const frameH = Math.min(52, Math.floor((avail - (n - 1) * 8) / n));
  const gap = n > 1 ? Math.min(8, Math.floor((avail - n * frameH) / (n - 1))) : 0;
  const spacing = frameH + gap;
  return { frameH, spacing, y: (i: number) => bottom - frameH - i * spacing };
}

const stack = {
  render(data: D) {
    const frames: string[] = data.frames;
    const { frameH, y } = stackLayout(frames.length);
    void y;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        <rect x="250" y="70" width="480" height="240" fill="none" stroke={INK} stroke-width="2.5" stroke-dasharray="8 6" class="ap-flow" />
        <text x="490" y="326" text-anchor="middle" font-size="11" fill="#555">
          {data.base ?? "bottom of stack"}
        </text>
        {frames.map((fr, i) => (
          <g key={i} data-e={`fr${i}`}>
            <rect x="266" y="0" width="448" height={frameH} rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" data-e={`frb${i}`} />
            <text x="286" y={frameH / 2 + 5} font-size="13" font-weight="700" data-e={`frt${i}`}>
              {fr}
            </text>
            <text x="694" y={frameH / 2 + 5} text-anchor="end" font-size="11" fill="#555" data-e={`frs${i}`} />
          </g>
        ))}
        <g data-e="stop">
          <path d="M742 0 L762 0 M752 -10 L752 10" stroke={ORANGE} stroke-width="4" />
          <text x="772" y="4" font-size="12" font-weight="700" fill={ORANGE}>
            top
          </text>
        </g>
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const frames: string[] = data.frames;
    const depths: number[] = data.depths;
    const { frameH, spacing, y } = stackLayout(frames.length);
    void frameH;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = depths[Math.min(s, depths.length - 1)];
    const nxt = depths[Math.min(s + 1, depths.length - 1)];
    const depth = lerp(cur, nxt, f);
    const park = 70 - frameH - 8; // hidden frames wait above the box, invisible
    frames.forEach((_, i) => {
      const shown = depth - i;
      const yy = shown <= 0 ? park : shown < 1 ? lerp(park, y(i), shown) : y(i);
      const g = q(root, `fr${i}`);
      if (g) {
        g.setAttribute("transform", `translate(0,${yy})`);
        g.setAttribute("opacity", shown <= 0 ? "0" : shown < 1 ? String(shown) : "1");
      }
      const isTop = i === Math.ceil(depth) - 1;
      setFill(root, `frb${i}`, isTop && shown >= 1 ? YELLOW : i === 0 ? "#e9fbe7" : PAPER);
    });
    move(root, "stop", 0, y(Math.max(Math.ceil(depth) - 1, 0)) + 8);
    const side: string[][] = data.side ?? [];
    const cur2 = side[Math.min(s, side.length - 1)] ?? [];
    frames.forEach((_, i) => setText(root, `frs${i}`, cur2[i] ?? ""));
  },
};

/* ---------------- tree: visit-order pulses ----------------
   data: { values: string[], visits: number[][] per step (cumulative), curs?: number[][] per step,
           edges?: 'all', title?, note? } */
export function treeLayout(n: number) {
  const depth = Math.ceil(Math.log2(n + 1));
  const pos: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const idxIn = i - (2 ** level - 1);
    const slots = 2 ** level;
    const spread = 880 / 2 ** level;
    pos.push({ x: 50 + spread * (idxIn + 0.5), y: 96 + level * 62 });
  }
  void depth;
  return pos;
}

const tree = {
  render(data: D) {
    const vals: string[] = data.values;
    const pos = treeLayout(vals.length);
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {vals.map((_, i) => {
          if (i === 0) return null;
          const p = Math.floor((i - 1) / 2);
          return <line key={`e${i}`} data-e={`te${i}`} x1={pos[p].x} y1={pos[p].y} x2={pos[i].x} y2={pos[i].y} stroke={INK} stroke-width="2.5" class="ap-xfade" />;
        })}
        {vals.map((v, i) => (
          <g key={i}>
            <circle data-e={`tn${i}`} cx={pos[i].x} cy={pos[i].y} r="24" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade ap-pulse-off" />
            <text x={pos[i].x} y={pos[i].y + 5} text-anchor="middle" font-size="13" font-weight="700">
              {v}
            </text>
            <text data-e={`to${i}`} x={pos[i].x} y={pos[i].y - 32} text-anchor="middle" font-size="11" font-weight="700" fill={PURPLE} />
          </g>
        ))}
        {data.note ? (
          <text x="490" y="336" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const vals: string[] = data.values;
    const visits: number[][] = data.visits;
    const curs: number[][] = data.curs ?? [];
    const s = stepOf(t, n);
    const vis = visits[Math.min(s, visits.length - 1)] ?? [];
    const cur = curs[Math.min(s, curs.length - 1)] ?? [];
    vals.forEach((_, i) => {
      const seen = vis.includes(i);
      const isCur = cur.includes(i);
      setFill(root, `tn${i}`, isCur ? ORANGE : seen ? GREEN : PAPER);
      setStroke(root, `tn${i}`, INK, isCur ? 4 : 2.5);
      const order = vis.indexOf(i);
      setText(root, `to${i}`, order >= 0 ? `${order + 1}` : "");
      if (i > 0) {
        const p = Math.floor((i - 1) / 2);
        const on = seen && vis.includes(p);
        const e = q(root, `te${i}`);
        if (e) {
          e.setAttribute("stroke", on ? INK : DIM);
          e.setAttribute("stroke-width", on ? "3.5" : "2");
          e.setAttribute("stroke-dasharray", on ? "none" : "4 5");
        }
      }
    });
  },
};

/* ---------------- heap: sift bubble along path ----------------
   data: { values: string[], paths: number[][] per step (node ids along sift),
           placed?: number[] per step, title?, note? } */
const heap = {
  render(data: D) {
    const vals: string[] = data.values;
    const pos = treeLayout(vals.length);
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {vals.map((_, i) => {
          if (i === 0) return null;
          const p = Math.floor((i - 1) / 2);
          return <line key={`e${i}`} data-e={`he${i}`} x1={pos[p].x} y1={pos[p].y} x2={pos[i].x} y2={pos[i].y} stroke={INK} stroke-width="2.5" />;
        })}
        {vals.map((v, i) => (
          <g key={i} data-e={`hg${i}`}>
            <circle data-e={`hn${i}`} cx={pos[i].x} cy={pos[i].y} r="24" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={pos[i].x} y={pos[i].y + 5} text-anchor="middle" font-size="13" font-weight="700">
              {v}
            </text>
          </g>
        ))}
        <g data-e="bubble">
          <circle r="24" fill={YELLOW} stroke={INK} stroke-width="4" />
          <text data-e="bubbletext" y="5" text-anchor="middle" font-size="13" font-weight="700" />
        </g>
        {data.note ? (
          <text x="490" y="336" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const vals: string[] = data.values;
    const pos = treeLayout(vals.length);
    const paths: number[][] = data.paths;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = paths[Math.min(s, paths.length - 1)] ?? [];
    const nxt = paths[Math.min(s + 1, paths.length - 1)] ?? cur;
    const placed: number[] = (data.placed ?? [])[Math.min(s, ((data.placed ?? []) as number[]).length - 1)] as any;
    const path = f < 0.5 ? cur : nxt.length >= cur.length ? nxt : cur;
    // bubble glides from last node of cur to last node of nxt
    const from = cur.length ? cur[cur.length - 1] : 0;
    const to = nxt.length ? nxt[nxt.length - 1] : from;
    const bp = { x: lerp(pos[from].x, pos[to].x, f), y: lerp(pos[from].y, pos[to].y, f) };
    move(root, "bubble", bp.x, bp.y);
    setText(root, "bubbletext", vals[to] ?? "");
    vals.forEach((_, i) => {
      const onPath = path.includes(i);
      const isPlaced = Array.isArray(placed) ? placed.includes(i) : false;
      setFill(root, `hn${i}`, isPlaced ? "#e9fbe7" : onPath ? "#fff3cf" : PAPER);
      setStroke(root, `hn${i}`, INK, onPath ? 3.5 : 2.5);
      setOp(root, `hg${i}`, i === to ? 0.25 : 1);
      if (i > 0) {
        const p = Math.floor((i - 1) / 2);
        const e = q(root, `he${i}`);
        if (e) {
          const hot = onPath && path.includes(p);
          e.setAttribute("stroke", hot ? ORANGE : INK);
          e.setAttribute("stroke-width", hot ? "4.5" : "2.5");
        }
      }
    });
  },
};

/* ---------------- graph: frontier wave ----------------
   data: { nodes: string[], edges: [number,number][], waves: number[][] per step (frontier),
           dones?: number[][] per step (cumulative), dists?: (string|null)[][] per step,
           layout?: 'ring'|'chain'|'star', title?, note? } */
export function graphLayout(m: number, layout = "ring") {
  const pos: { x: number; y: number }[] = [];
  if (layout === "chain") {
    for (let i = 0; i < m; i++) pos.push({ x: 120 + i * ((740 / Math.max(m - 1, 1))), y: 200 });
  } else if (layout === "star") {
    pos.push({ x: 490, y: 190 });
    for (let i = 1; i < m; i++) {
      const a = ((i - 1) / (m - 1)) * Math.PI * 2 - Math.PI / 2;
      pos.push({ x: 490 + 300 * Math.cos(a), y: 195 + 105 * Math.sin(a) });
    }
  } else {
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2 - Math.PI / 2;
      pos.push({ x: 490 + 320 * Math.cos(a), y: 195 + 110 * Math.sin(a) });
    }
  }
  return pos;
}

const graph = {
  render(data: D) {
    const nodes: string[] = data.nodes;
    const edges: [number, number][] = data.edges;
    const pos = graphLayout(nodes.length, data.layout);
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {edges.map(([a, b], k) => (
          <line key={k} data-e={`ge${k}`} x1={pos[a].x} y1={pos[a].y} x2={pos[b].x} y2={pos[b].y} stroke={INK} stroke-width="2.5" />
        ))}
        {nodes.map((nd, i) => (
          <g key={i}>
            <text data-e={`gd${i}`} x={pos[i].x} y={pos[i].y - 36} text-anchor="middle" font-size="12" font-weight="700" />
            <circle data-e={`gn${i}`} cx={pos[i].x} cy={pos[i].y} r="24" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={pos[i].x} y={pos[i].y + 5} text-anchor="middle" font-size="13" font-weight="700">
              {nd}
            </text>
          </g>
        ))}
        <g data-e="gwave">
          <circle r="34" fill="none" stroke={ORANGE} stroke-width="4" stroke-dasharray="8 6" class="ap-flow" />
        </g>
        {data.note ? (
          <text x="490" y="336" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const nodes: string[] = data.nodes;
    const edges: [number, number][] = data.edges;
    const pos = graphLayout(nodes.length, data.layout);
    const waves: number[][] = data.waves;
    const dones: number[][] = data.dones ?? [];
    const dists: (string | null)[][] = data.dists ?? [];
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const wave = waves[Math.min(s, waves.length - 1)] ?? [];
    const done = dones[Math.min(s, dones.length - 1)] ?? [];
    const dist = dists[Math.min(s, dists.length - 1)] ?? [];
    nodes.forEach((_, i) => {
      const isW = wave.includes(i);
      const isD = done.includes(i);
      setFill(root, `gn${i}`, isW ? ORANGE : isD ? GREEN : PAPER);
      setStroke(root, `gn${i}`, INK, isW ? 4 : 2.5);
      setText(root, `gd${i}`, (dist[i] as string) ?? "");
    });
    edges.forEach(([a, b], k) => {
      const hot = (done.includes(a) || wave.includes(a)) && (done.includes(b) || wave.includes(b));
      const e = q(root, `ge${k}`);
      if (e) {
        e.setAttribute("stroke", hot ? INK : DIM);
        e.setAttribute("stroke-width", hot ? "3.5" : "2");
      }
    });
    // wave ring glides across the current frontier nodes
    const seq = wave.length ? wave : done.length ? [done[done.length - 1]] : [0];
    const a = pos[seq[Math.floor(f * seq.length)] ?? seq[0]];
    const b = pos[seq[Math.min(Math.floor(f * seq.length) + 1, seq.length - 1)] ?? seq[0]];
    const k = f * seq.length - Math.floor(f * seq.length);
    move(root, "gwave", lerp(a.x, b.x, k), lerp(a.y, b.y, k));
  },
};

/* ---------------- grid: DP table fill ----------------
   data: { rows, cols, cells?: string[][], fills: number[][] per step (flat idx cumulative),
           curs?: number[][] per step, arrows?: [number,number][] (flat idx pairs),
           title?, note? } */
const grid = {
  render(data: D) {
    const rows: number = data.rows;
    const cols: number = data.cols;
    const cw = Math.min(86, 860 / cols);
    const ch = Math.min(52, 210 / rows);
    const x0 = (980 - cols * cw) / 2;
    const y0 = 84;
    const cells: string[][] = data.cells ?? [];
    const idx = (r: number, c: number) => r * cols + c;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {(data.arrows ?? []).map(([a, b]: [number, number], k: number) => {
          const ra = Math.floor(a / cols);
          const ca = a % cols;
          const rb = Math.floor(b / cols);
          const cb = b % cols;
          return (
            <line
              key={k}
              x1={x0 + ca * cw + cw / 2}
              y1={y0 + ra * ch + ch / 2}
              x2={x0 + cb * cw + cw / 2}
              y2={y0 + rb * ch + ch / 2}
              stroke={PURPLE}
              stroke-width="2"
              stroke-dasharray="5 4"
              class="ap-flow"
              opacity="0.8"
            />
          );
        })}
        {Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => (
            <g key={idx(r, c)}>
              <rect data-e={`gc${idx(r, c)}`} x={x0 + c * cw} y={y0 + r * ch} width={cw} height={ch} fill={PAPER} stroke={INK} stroke-width="2" class="ap-xfade" />
              <text x={x0 + c * cw + cw / 2} y={y0 + r * ch + ch / 2 + 5} text-anchor="middle" font-size="13" font-weight="700">
                {(cells[r] ?? [])[c] ?? ""}
              </text>
            </g>
          )),
        )}
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const rows: number = data.rows;
    const cols: number = data.cols;
    const fills: number[][] = data.fills;
    const curs: number[][] = data.curs ?? [];
    const s = stepOf(t, n);
    const fill = fills[Math.min(s, fills.length - 1)] ?? [];
    const cur = curs[Math.min(s, curs.length - 1)] ?? [];
    for (let i = 0; i < rows * cols; i++) {
      const isF = fill.includes(i);
      const isC = cur.includes(i);
      setFill(root, `gc${i}`, isC ? ORANGE : isF ? "#e9fbe7" : PAPER);
      const e = q(root, `gc${i}`);
      if (e) e.setAttribute("stroke-width", isC ? "3.5" : "2");
    }
  },
};

/* ---------------- buckets: hash buckets + chains ----------------
   data: { nb: number, keys: string[], to: number[] (bucket per key),
           placed: number[] per step (count), hi?: number[] per step (key idx),
           hlabel?: (k: string) => string — pass hlabels: string[] per key, title?, note? } */
const buckets = {
  render(data: D) {
    const nb: number = data.nb;
    const keys: string[] = data.keys;
    const bw = Math.min(150, 880 / nb);
    const x0 = (980 - nb * bw) / 2;
    const topY = 220;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {Array.from({ length: nb }, (_, b) => (
          <g key={b}>
            <rect data-e={`bk${b}`} x={x0 + b * bw + 6} y={topY} width={bw - 12} height="86" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={x0 + b * bw + bw / 2} y={topY + 104} text-anchor="middle" font-size="11" fill="#555">
              bucket {b}
            </text>
          </g>
        ))}
        {keys.map((k, i) => (
          <g key={i} data-e={`kg${i}`}>
            <rect data-e={`kk${i}`} x="-52" y="-17" width="104" height="34" rx="17" fill={YELLOW} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x="0" y="5" text-anchor="middle" font-size="13" font-weight="700">
              {k}
            </text>
            <text data-e={`kh${i}`} x="0" y="-26" text-anchor="middle" font-size="11" font-weight="700" fill={PURPLE} />
          </g>
        ))}
        {data.note ? (
          <text x="490" y="336" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const nb: number = data.nb;
    const keys: string[] = data.keys;
    const to: number[] = data.to;
    const placed: number[] = data.placed;
    const hi: number[] = (data.hi ?? [])[Math.min(stepOf(t, n), ((data.hi ?? []) as number[][]).length - 1)] as any;
    const hlabels: string[] = data.hlabels ?? [];
    const bw = Math.min(150, 880 / nb);
    const x0 = (980 - nb * bw) / 2;
    const topY = 220;
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const count = placed[Math.min(s, placed.length - 1)] ?? keys.length;
    // chain depth per bucket among placed keys: stack upward above the bucket
    const depthSeen = new Array(nb).fill(0);
    keys.forEach((_, i) => {
      const b = to[i];
      const slot = i < count ? depthSeen[b] : 0;
      if (i < count) depthSeen[b]++;
      const bx = x0 + b * bw + bw / 2;
      const by = topY + 24 - slot * 40;
      // waiting position: top row spread
      const wx = 120 + i * (740 / Math.max(keys.length - 1, 1));
      const wy = 116;
      const prog = i < count ? (i === count - 1 ? f : 1) : 0;
      const x = lerp(wx, bx, prog);
      const y = lerp(wy, by, prog);
      move(root, `kg${i}`, x, y);
      const isHi = Array.isArray(hi) ? hi.includes(i) : hi === i;
      setFill(root, `kk${i}`, i < count ? (isHi ? ORANGE : "#e9fbe7") : YELLOW);
      setText(root, `kh${i}`, hlabels[i] ?? (i < count ? "" : `h=${b}`));
      setOp(root, `kg${i}`, 1);
      void bx;
      void by;
    });
    // bucket glow when receiving
    for (let b = 0; b < nb; b++) setFill(root, `bk${b}`, PAPER);
  },
};

/* ---------------- choice: greedy commit / reject ----------------
   data: { items: {label, val}[], takes: number[][] per step, rejects: number[][] per step,
           curs?: number[][] per step, title?, note? } */
const choice = {
  render(data: D) {
    const items: { label: string; val: string }[] = data.items;
    const m = items.length;
    const cw = Math.min(160, 880 / m);
    const x0 = (980 - m * cw) / 2;
    const y = 150;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {items.map((it, i) => (
          <g key={i}>
            <text x={x0 + i * cw + cw / 2} y={y - 40} text-anchor="middle" font-size="13" font-weight="700">
              {it.val}
            </text>
            <rect data-e={`cc${i}`} x={x0 + i * cw + 5} y={y - 14} width={cw - 10} height="86" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={x0 + i * cw + cw / 2} y={y + 28} text-anchor="middle" font-size="12" font-weight="700">
              {it.label}
            </text>
            <text data-e={`cs${i}`} x={x0 + i * cw + cw / 2} y={y + 108} text-anchor="middle" font-size="14" font-weight="700" />
          </g>
        ))}
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const items: { label: string; val: string }[] = data.items;
    const takes: number[][] = data.takes;
    const rejects: number[][] = data.rejects;
    const curs: number[][] = data.curs ?? [];
    const s = stepOf(t, n);
    const tk = takes[Math.min(s, takes.length - 1)] ?? [];
    const rj = rejects[Math.min(s, rejects.length - 1)] ?? [];
    const cu = curs[Math.min(s, curs.length - 1)] ?? [];
    items.forEach((_, i) => {
      const isT = tk.includes(i);
      const isR = rj.includes(i);
      const isC = cu.includes(i);
      setFill(root, `cc${i}`, isT ? "#e9fbe7" : isR ? "#efe8d2" : isC ? "#fff3cf" : PAPER);
      const e = q(root, `cc${i}`);
      if (e) {
        e.setAttribute("stroke-width", isC || isT ? "3.5" : "2.5");
        e.setAttribute("opacity", isR ? "0.55" : "1");
      }
      setText(root, `cs${i}`, isT ? "✓ take" : isR ? "✗ skip" : isC ? "?" : "");
      const st = q(root, `cs${i}`);
      if (st) st.setAttribute("fill", isT ? "#16a34a" : isR ? "#999" : ORANGE);
    });
  },
};

/* ---------------- curves: growth race ----------------
   data: { focus: number[] per step (curve idx, -1 = all), title?, note? } */
const CURVES = [
  { name: "O(1)", color: "#555" },
  { name: "O(log n)", color: "#16a34a" },
  { name: "O(n)", color: PURPLE },
  { name: "O(n²)", color: PINK },
];
const curves = {
  render(data: D) {
    const W = 980;
    const padL = 120;
    const padB = 60;
    const padT = 70;
    const padR = 130;
    const x = (v: number) => padL + (v / 12) * (W - padL - padR);
    const y = (v: number) => 320 - padB - (Math.min(v, 40) / 40) * (320 - padB - padT);
    const fns = [
      () => 2,
      (v: number) => (v < 1 ? 0 : 2 + Math.log2(v) * 4),
      (v: number) => 2 + v * 2.6,
      (v: number) => 2 + v * v * 0.28,
    ];
    const path = (fn: (v: number) => number) =>
      Array.from({ length: 25 }, (_, k) => {
        const v = (k / 24) * 12;
        return `${k === 0 ? "M" : "L"} ${x(v).toFixed(1)} ${y(fn(v)).toFixed(1)}`;
      }).join(" ");
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        <line x1={padL} y1={320 - padB} x2={W - padR} y2={320 - padB} stroke={INK} stroke-width="2.5" />
        <line x1={padL} y1={padT} x2={padL} y2={320 - padB} stroke={INK} stroke-width="2.5" />
        <text x={(padL + W - padR) / 2} y="312" text-anchor="middle" font-size="11" fill="#555">
          input size n →
        </text>
        {CURVES.map((c, i) => (
          <g key={i}>
            <path data-e={`cv${i}`} d={path(fns[i])} fill="none" stroke={c.color} stroke-width="3" class="ap-xfade" />
            <text x={W - padR + 8} y={y(fns[i](12)) + 4} font-size="12" font-weight="700" fill={c.color}>
              {c.name}
            </text>
            <g data-e={`cd${i}`}>
              <circle r="11" fill={c.color} stroke={INK} stroke-width="2.5" />
            </g>
          </g>
        ))}
        {data.note ? (
          <text x="430" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const W = 980;
    const padL = 120;
    const padB = 60;
    const padT = 70;
    const padR = 130;
    const fns = [
      () => 2,
      (v: number) => (v < 1 ? 0 : 2 + Math.log2(v) * 4),
      (v: number) => 2 + v * 2.6,
      (v: number) => 2 + v * v * 0.28,
    ];
    const X = (v: number) => padL + (v / 12) * (W - padL - padR);
    const Y = (v: number) => 320 - padB - (Math.min(v, 40) / 40) * (320 - padB - padT);
    const p = clamp01(t / n);
    const v = easeInOut(p) * 12;
    const focus: number[] = data.focus;
    const s = stepOf(t, n);
    const fo = focus[Math.min(s, focus.length - 1)] ?? -1;
    CURVES.forEach((_, i) => {
      move(root, `cd${i}`, X(v), Y(fns[i](v)));
      const e = q(root, `cv${i}`);
      if (e) {
        e.setAttribute("opacity", fo === -1 || fo === i ? "1" : "0.22");
        e.setAttribute("stroke-width", fo === i ? "5" : "3");
      }
      setOp(root, `cd${i}`, fo === -1 || fo === i ? 1 : 0.25);
    });
  },
};

/* ---------------- bits: cells flipping ----------------
   data: { bits: number[], ops: { flip?: number[], hi?: number[] }[] per step,
           labels?: string[], title?, note? } */
const bits = {
  render(data: D) {
    const b: number[] = data.bits;
    const m = b.length;
    const cw = Math.min(84, 860 / m);
    const x0 = (980 - m * cw) / 2;
    const y = 170;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {b.map((bit, i) => (
          <g key={i}>
            <text data-e={`bt${i}`} x={x0 + i * cw + cw / 2} y={y - 16} text-anchor="middle" font-size="16" font-weight="700">
              {bit}
            </text>
            <rect data-e={`bc${i}`} x={x0 + i * cw + 4} y={y} width={cw - 8} height="56" rx="6" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={x0 + i * cw + cw / 2} y={y + 78} text-anchor="middle" font-size="11" fill="#555">
              {(data.labels ?? [])[i] ?? `2^${m - 1 - i}`}
            </text>
          </g>
        ))}
        <text data-e="bnote2" x="490" y="300" text-anchor="middle" font-size="13" font-weight="700" />
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const b: number[] = [...data.bits];
    const ops: { flip?: number[]; hi?: number[]; show?: string }[] = data.ops;
    const s = stepOf(t, n);
    const seen = new Set<number>();
    for (let k = 0; k <= s && k < ops.length; k++) (ops[k].flip ?? []).forEach((i) => (seen.has(i) ? seen.delete(i) : seen.add(i)));
    b.forEach((bit, i) => {
      const v = seen.has(i) ? 1 - bit : bit;
      setText(root, `bt${i}`, String(v));
      const isHi = (ops[Math.min(s, ops.length - 1)].hi ?? []).includes(i);
      setFill(root, `bc${i}`, seen.has(i) ? "#e9fbe7" : PAPER);
      setStroke(root, `bc${i}`, INK, isHi ? 4 : 2.5);
    });
    setText(root, "bnote2", ops[Math.min(s, ops.length - 1)].show ?? "");
  },
};

/* ---------------- pipeline: token flowing through stages ----------------
   data: { stages: string[], at: number[] per step (stage idx), done?: number[][] per step,
           title?, note? } */
const pipeline = {
  render(data: D) {
    const stages: string[] = data.stages;
    const m = stages.length;
    const cw = Math.min(200, 860 / m);
    const x0 = (980 - m * cw) / 2;
    const y = 170;
    return (
      <g>
        <text x="490" y="52" text-anchor="middle" font-size="12" font-weight="700">
          {data.title ?? ""}
        </text>
        {stages.map((st, i) => (
          <g key={i}>
            {i > 0 ? <line x1={x0 + i * cw - 4} y1={y} x2={x0 + i * cw + 4} y2={y} stroke={INK} stroke-width="2.5" stroke-dasharray="6 5" class="ap-flow" /> : null}
            <rect data-e={`ps${i}`} x={x0 + i * cw + 6} y={y - 34} width={cw - 12} height="68" rx="8" fill={PAPER} stroke={INK} stroke-width="2.5" class="ap-xfade" />
            <text x={x0 + i * cw + cw / 2} y={y - 4} text-anchor="middle" font-size="12" font-weight="700">
              {st.split("|")[0]}
            </text>
            <text x={x0 + i * cw + cw / 2} y={y + 16} text-anchor="middle" font-size="11" fill="#555">
              {st.split("|")[1] ?? ""}
            </text>
            <text x={x0 + i * cw + cw / 2} y={y - 48} text-anchor="middle" font-size="11" font-weight="700" fill={PURPLE}>
              {`${i + 1}`}
            </text>
          </g>
        ))}
        <g data-e="ptoken">
          <circle r="13" fill={GREEN} stroke={INK} stroke-width="3" />
          <text y="4" text-anchor="middle" font-size="10" font-weight="700">
            ●
          </text>
        </g>
        {data.note ? (
          <text x="490" y="330" text-anchor="middle" font-size="12" font-weight="700">
            {data.note}
          </text>
        ) : null}
      </g>
    );
  },
  pose(t: number, n: number, data: D, root: Root) {
    const stages: string[] = data.stages;
    const m = stages.length;
    const cw = Math.min(200, 860 / m);
    const x0 = (980 - m * cw) / 2;
    const y = 170;
    const at: number[] = data.at;
    const dones: number[][] = data.dones ?? [];
    const s = stepOf(t, n);
    const f = easeInOut(segf(t, s));
    const cur = at[Math.min(s, at.length - 1)] ?? 0;
    const nxt = at[Math.min(s + 1, at.length - 1)] ?? cur;
    const px = (i: number) => x0 + i * cw + cw / 2;
    move(root, "ptoken", lerp(px(cur), px(nxt), f), y - 62);
    const done = dones[Math.min(s, dones.length - 1)] ?? [];
    stages.forEach((_, i) => {
      const isCur = i === Math.round(lerp(cur, nxt, f));
      setFill(root, `ps${i}`, done.includes(i) ? "#e9fbe7" : isCur ? YELLOW : PAPER);
      setStroke(root, `ps${i}`, INK, isCur ? 3.5 : 2.5);
    });
  },
};

export const PATTERNS: Record<PatternKind, { render: (data: D) => JSX.Element; pose: (t: number, n: number, data: D, root: Root) => void }> = {
  lane,
  bars,
  halving,
  stack,
  tree,
  heap,
  graph,
  grid,
  buckets,
  choice,
  curves,
  bits,
  pipeline,
};
