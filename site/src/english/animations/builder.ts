import { COMP, COLOR, EASE_IN, EASE_OUT, FONT } from "./tokens";
import type { Layer, LottieDoc, ShapeItem, Prop } from "./lottie-types";

const { W, H, FR, OP } = COMP;
type RGBA = readonly number[];

export const st = <T>(k: T): { a: 0; k: T } => ({ a: 0, k });
const identityTr = (): ShapeItem => ({ ty: "tr", p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100) });

/** opacity 0→100 + scale pop, starting at frame `at`. */
export function reveal(at: number): { o: Prop; s: Prop } {
  return {
    o: { a: 1, k: [{ t: at, s: [0], i: EASE_IN, o: EASE_OUT }, { t: at + 8, s: [100] }] },
    s: { a: 1, k: [{ t: at, s: [60, 60, 100], i: EASE_IN, o: EASE_OUT }, { t: at + 10, s: [100, 100, 100] }] },
  };
}

const group = (it: ShapeItem[]): ShapeItem => ({ ty: "gr", it: [...it, identityTr()] });
const ellipse = (d: number, c: RGBA, o = 100): ShapeItem[] => [
  { ty: "el", p: st([0, 0]), s: st([d, d]) },
  { ty: "fl", c: st([...c]), o: st(o) },
];
const rect = (w: number, h: number, r: number, c: RGBA, o = 100): ShapeItem[] => [
  { ty: "rc", p: st([0, 0]), s: st([w, h]), r: st(r) },
  { ty: "fl", c: st([...c]), o: st(o) },
];

// ---- base layers -----------------------------------------------------------

export function bgLayer(): Layer {
  return {
    ty: 4, nm: "bg", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([W / 2, H / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(W, H, 0, COLOR.bg))],
  };
}

export function textLayer(text: string, x: number, y: number, at: number, size = 28, fc: RGBA = COLOR.ink): Layer {
  const { o } = reveal(at);
  return {
    ty: 5, nm: `label:${text}`, ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    t: { d: { k: [{ t: 0, s: { s: size, f: "sans", t: text, j: 2, tr: 0, lh: size + 6, ls: 0, fc: [fc[0], fc[1], fc[2]] } } ] }, p: {}, m: { g: 1, a: st([0, 0]) }, a: [] },
  };
}

export function dotLayer(x: number, y: number, at: number, d = 20, c: RGBA = COLOR.ink): Layer {
  const { o, s } = reveal(at);
  return {
    ty: 4, nm: "dot", ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s, r: st(0) },
    shapes: [group(ellipse(d, c))],
  };
}

export function chipLayer(text: string, x: number, y: number, at: number, w = 130, fill: RGBA = COLOR.surface, fc: RGBA = COLOR.ink): Layer[] {
  const { o, s } = reveal(at);
  const box: Layer = {
    ty: 4, nm: `chip:${text}`, ip: 0, op: OP, st: 0,
    ks: { o, p: st([x, y, 0]), a: st([0, 0, 0]), s, r: st(0) },
    shapes: [group(rect(w, 58, 12, fill))],
  };
  return [textLayer(text, x, y - 9, at + 2, 26, fc), box];
}

// ---- scene primitives (return layers top→bottom; caller appends bg) --------

const spread = (n: number, x0: number, x1: number): number[] =>
  n === 1 ? [(x0 + x1) / 2] : Array.from({ length: n }, (_, i) => x0 + (i * (x1 - x0)) / (n - 1));

/** axis with evenly spaced nodes + labels + a traveling playhead (timeline). */
export function axisScene(labels: string[]): Layer[] {
  const X0 = 90, X1 = 710, Y = 260;
  const xs = spread(labels.length, X0, X1);
  const playhead: Layer = {
    ty: 4, nm: "playhead", ip: 0, op: OP, st: 0,
    ks: {
      o: { a: 1, k: [{ t: 8, s: [0], i: EASE_IN, o: EASE_OUT }, { t: 16, s: [100] }, { t: 78, s: [100], i: EASE_IN, o: EASE_OUT }, { t: 88, s: [0] }] },
      p: { a: 1, k: [{ t: 12, s: [X0, Y, 0], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [X1, Y, 0] }] },
      a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0),
    },
    shapes: [group([...ellipse(34, COLOR.accent, 35), ...ellipse(16, COLOR.accent)])],
  };
  const axis: Layer = {
    ty: 4, nm: "axis", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([X0, Y, 0]), a: st([0, 0, 0]), r: st(0),
          s: { a: 1, k: [{ t: 0, s: [0, 100, 100], i: EASE_IN, o: EASE_OUT }, { t: 16, s: [100, 100, 100] }] } },
    shapes: [{ ty: "gr", it: [{ ty: "rc", p: st([(X1 - X0) / 2, 0]), s: st([X1 - X0, 4]), r: st(2) }, { ty: "fl", c: st([...COLOR.line]), o: st(100) }, identityTr()] }],
  };
  return [
    playhead,
    ...labels.map((t, i) => textLayer(t, xs[i], Y - 42, 14 + i * 7)),
    ...xs.map((x, i) => dotLayer(x, Y, 12 + i * 7)),
    axis,
  ];
}

/** evenly spaced labelled nodes; mode "row" (horizontal) or "stack" (vertical, growing). */
export function nodeRowScene(labels: string[], opts: { mode: "row" | "stack" } = { mode: "row" }): Layer[] {
  if (opts.mode === "stack") {
    const ys = spread(labels.length, 120, 360);
    return labels.flatMap((t, i) => chipLayer(t, W / 2, ys[i], 10 + i * 8, 220));
  }
  const xs = spread(labels.length, 150, 650);
  return labels.flatMap((t, i) => chipLayer(t, xs[i], H / 2, 10 + i * 8));
}

/** two labelled boxes side by side with a divider (contrast). */
export function twoBoxScene(left: string, right: string): Layer[] {
  const divider: Layer = {
    ty: 4, nm: "divider", ip: 0, op: OP, st: 0,
    ks: { o: { a: 1, k: [{ t: 6, s: [0] }, { t: 16, s: [100] }] }, p: st([W / 2, H / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(3, 200, 1, COLOR.line))],
  };
  const revL = reveal(8), revR = reveal(16);
  return [
    textLayer(left, W / 2 - 180, H / 2, 12, 30, COLOR.accent),
    textLayer(right, W / 2 + 180, H / 2, 20, 30, COLOR.warn),
    {
      ty: 4, nm: "boxL", ip: 0, op: OP, st: 0,
      ks: { o: revL.o, p: st([W / 2 - 180, H / 2, 0]), a: st([0, 0, 0]), s: revL.s, r: st(0) },
      shapes: [group(rect(280, 150, 16, COLOR.surface))],
    },
    {
      ty: 4, nm: "boxR", ip: 0, op: OP, st: 0,
      ks: { o: revR.o, p: st([W / 2 + 180, H / 2, 0]), a: st([0, 0, 0]), s: revR.s, r: st(0) },
      shapes: [group(rect(280, 150, 16, COLOR.surface))],
    },
    divider,
  ];
}

/** source → arrow → result (transformation). */
export function transformScene(from: string, to: string): Layer[] {
  const arrow: Layer = {
    ty: 4, nm: "arrow", ip: 0, op: OP, st: 0,
    ks: { o: st(100), p: st([W / 2 - 80, H / 2, 0]), a: st([0, 0, 0]), r: st(0),
          s: { a: 1, k: [{ t: 18, s: [0, 100, 100], i: EASE_IN, o: EASE_OUT }, { t: 34, s: [100, 100, 100] }] } },
    shapes: [{ ty: "gr", it: [{ ty: "rc", p: st([80, 0]), s: st([160, 8] ), r: st(4) }, { ty: "fl", c: st([...COLOR.accent]), o: st(100) }, identityTr()] }],
  };
  return [
    ...chipLayer(from, W / 2 - 220, H / 2, 10, 200, COLOR.surface, COLOR.ink),
    arrow,
    ...chipLayer(to, W / 2 + 220, H / 2, 36, 200, COLOR.surface, COLOR.accent),
  ];
}

/** root forks into branches (conditionals). labels[0]=root, rest=branches. */
export function branchScene(root: string, branches: string[]): Layer[] {
  const ys = spread(branches.length, 140, 360);
  const connectors: Layer[] = branches.map((_, i) => ({
    ty: 4, nm: `conn:${i}`, ip: 0, op: OP, st: 0,
    ks: { o: { a: 1, k: [{ t: 18 + i * 6, s: [0] }, { t: 28 + i * 6, s: [100] }] }, p: st([330, (H / 2 + ys[i]) / 2, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
    shapes: [group(rect(120, 3, 1, COLOR.line))],
  }));
  return [
    ...chipLayer(root, 200, H / 2, 8, 180, COLOR.surface, COLOR.accent),
    ...branches.flatMap((t, i) => chipLayer(t, 560, ys[i], 22 + i * 8, 200)),
    ...connectors,
  ];
}

/** two chips swap positions (word-order inversion). */
export function swapScene(a: string, b: string): Layer[] {
  const xL = W / 2 - 150, xR = W / 2 + 150;
  const mk = (text: string, fromX: number, toX: number): Layer[] => {
    const { o } = reveal(8);
    const box: Layer = {
      ty: 4, nm: `swap:${text}`, ip: 0, op: OP, st: 0,
      ks: { o, a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0),
            p: { a: 1, k: [{ t: 20, s: [fromX, H / 2, 0], i: EASE_IN, o: EASE_OUT }, { t: 50, s: [toX, H / 2, 0], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [fromX, H / 2, 0] }] } },
      shapes: [group(rect(150, 64, 14, COLOR.surface))],
    };
    return [box];
  };
  return [
    textLayer(a, xL, H / 2 - 9, 10, 26, COLOR.accent),
    textLayer(b, xR, H / 2 - 9, 10, 26, COLOR.warn),
    ...mk(a, xL, xR),
    ...mk(b, xR, xL),
  ];
}

/** two-column mapping rows (e.g. pronoun ↔ possessive). pairs from labels/items. */
export function mapScene(pairs: Array<[string, string]>): Layer[] {
  const ys = spread(pairs.length, 110, 360);
  return pairs.flatMap(([l, r], i) => [
    ...chipLayer(l, W / 2 - 150, ys[i], 8 + i * 6, 180, COLOR.surface, COLOR.ink),
    ...chipLayer(r, W / 2 + 150, ys[i], 14 + i * 6, 180, COLOR.surface, COLOR.accent),
    {
      ty: 4, nm: `arrow:${i}`, ip: 0, op: OP, st: 0,
      ks: { o: { a: 1, k: [{ t: 16 + i * 6, s: [0] }, { t: 26 + i * 6, s: [100] }] }, p: st([W / 2, ys[i], 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), r: st(0) },
      shapes: [group(rect(110, 3, 1, COLOR.line))],
    } as Layer,
  ]);
}

/** a phrase with one token highlighted by a pulsing underline (agreement). */
export function highlightScene(tokens: string[], focusIndex: number): Layer[] {
  const xs = spread(tokens.length, 170, 630);
  const fx = xs[Math.min(focusIndex, xs.length - 1)];
  const pulse: Layer = {
    ty: 4, nm: "pulse", ip: 0, op: OP, st: 0,
    ks: { p: st([fx, H / 2 + 26, 0]), a: st([0, 0, 0]), r: st(0),
          o: { a: 1, k: [{ t: 20, s: [0] }, { t: 30, s: [100] }] },
          s: { a: 1, k: [{ t: 30, s: [100, 100], i: EASE_IN, o: EASE_OUT }, { t: 55, s: [130, 100], i: EASE_IN, o: EASE_OUT }, { t: 80, s: [100, 100] }] } },
    shapes: [group(rect(120, 6, 3, COLOR.accent))],
  };
  return [...tokens.map((t, i) => textLayer(t, xs[i], H / 2, 8 + i * 5, 30, i === focusIndex ? COLOR.accent : COLOR.ink)), pulse];
}

// ---- doc wrapper -----------------------------------------------------------

export function doc(layers: Layer[]): LottieDoc {
  return { v: "5.7.0", fr: FR, ip: 0, op: OP, w: W, h: H, assets: [], fonts: FONT, layers: [...layers, bgLayer()] };
}
