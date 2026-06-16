// site/src/english/animations/editorial/build-scene.ts
import type { Scene, Prim } from "./scene-types";
import { VIEW } from "./scene-types";
import type { DiagramInput } from "./diagram-input";

// Local alias — Prim variants don't carry `order`; Scene.prims does.
type P = Prim & { order?: number };

const PERFECT = new Set(["aspect"]); // families that get the retrospective arc; tenses decided by label set below
const isRetrospective = (d: DiagramInput): boolean => {
  const ls = d.labels.map((s) => s.toLowerCase());
  const hasNow = ls.includes("now"), hasPast = ls.includes("past");
  return PERFECT.has(d.family) || (d.family === "tenses" && hasNow && hasPast && d.labels.length <= 3);
};

function header(d: DiagramInput): P[] {
  const p: P[] = [{ k: "genre", text: d.genre.toUpperCase(), x: 56, y: 70, order: 0 }];
  if (d.formula) p.push({ k: "formula", text: d.formula, x: 400, y: 150, order: 1 });
  return p;
}

export function buildTimelineScene(d: DiagramInput): Scene {
  const Y = 280, X0 = 90, X1 = 710;
  const prims: P[] = [...header(d), { k: "axis", x0: X0, x1: X1, y: Y, arrow: true, order: 2 }];
  if (isRetrospective(d)) {
    const past = { x: 230, y: Y }, now = { x: 560, y: Y };
    prims.push(
      { k: "arc", from: past, to: now, lift: 120, order: 3 },
      { k: "node", x: past.x, y: Y, fill: "hollow", order: 4 },
      { k: "node", x: now.x, y: Y, fill: "solid", order: 5 },
      { k: "dropLine", x: now.x, y0: Y - 70, y1: Y, order: 5 },
      { k: "tick", x: past.x, y: Y, label: (d.labels[0] ?? "past").toUpperCase(), order: 4 },
      { k: "tick", x: now.x, y: Y, label: (d.labels[1] ?? "now").toUpperCase(), order: 5 },
      { k: "tick", x: 700, y: Y, label: (d.labels[2] ?? "future").toUpperCase(), order: 6 },
    );
    if (d.hero) prims.push({ k: "hero", text: d.hero, x: past.x - 30, y: Y - 90, order: 4 });
    if (d.caption) prims.push({ k: "caption", text: d.caption, x: now.x, y: Y + 90, order: 6 });
  } else {
    const labels = d.labels.length ? d.labels : ["—"];
    const xs = labels.map((_, i) => (labels.length === 1 ? (X0 + X1) / 2 : X0 + (i * (X1 - X0)) / (labels.length - 1)));
    labels.forEach((t, i) => {
      prims.push({ k: "node", x: xs[i], y: Y, fill: i === 0 ? "solid" : "hollow", order: 3 + i });
      prims.push({ k: "tick", x: xs[i], y: Y, label: t.toUpperCase(), order: 3 + i });
    });
    if (d.caption) prims.push({ k: "caption", text: d.caption, x: 400, y: Y + 90, order: 3 + labels.length });
  }
  return { prims };
}

/** contrast-pair: two chips left/right with a vertical divider */
export function buildContrastScene(d: DiagramInput): Scene {
  const prims: P[] = [...header(d)];
  const leftText = d.labels[0] ?? d.items[0] ?? "A";
  const rightText = d.labels[1] ?? d.items[1] ?? "B";
  prims.push(
    { k: "divider", x: 400, y0: 170, y1: 330, order: 2 },
    { k: "chip", text: leftText, x: 230, y: 250, tone: "ink", order: 3 },
    { k: "chip", text: rightText, x: 570, y: 250, tone: "accent", order: 4 },
  );
  if (d.caption) prims.push({ k: "caption", text: d.caption, x: 400, y: 380, order: 5 });
  return { prims };
}

/** transformation: source chip → arrow → result chip */
export function buildTransformScene(d: DiagramInput): Scene {
  const prims: P[] = [...header(d)];
  const fromText = d.labels[0] ?? d.items[0] ?? "before";
  const toText = d.labels[1] ?? d.items[1] ?? "after";
  prims.push(
    { k: "chip", text: fromText, x: 190, y: 225, order: 2 },
    { k: "arrow", from: { x: 300, y: 225 }, to: { x: 500, y: 225 }, order: 3 },
    { k: "chip", text: toText, x: 610, y: 225, tone: "accent", order: 4 },
  );
  if (d.caption) prims.push({ k: "caption", text: d.caption, x: 400, y: 340, order: 5 });
  return { prims };
}

/** map: rows of left chip → arrow → right chip from items parsed as "a→b" */
export function buildMapScene(d: DiagramInput): Scene {
  const prims: P[] = [...header(d)];
  // Parse items as "a→b" pairs; fallback to zipping labels
  type Pair = [string, string];
  let pairs: Pair[] = d.items
    .map((s) => {
      const sep = s.includes("→") ? "→" : s.includes("->") ? "->" : null;
      if (sep) {
        const [l, r] = s.split(sep);
        return [l.trim(), (r ?? "").trim()] as Pair;
      }
      return null;
    })
    .filter((p): p is Pair => p !== null);
  if (!pairs.length && d.labels.length >= 2) {
    pairs = d.labels.reduce<Pair[]>((acc, _, i) => {
      if (i % 2 === 0 && d.labels[i + 1] !== undefined) acc.push([d.labels[i], d.labels[i + 1]]);
      return acc;
    }, []);
  }
  const MAX_ROWS = 4;
  const visible = pairs.slice(0, MAX_ROWS);
  const dropped = pairs.length - visible.length;
  // Spread y from 160 to 330
  const ySpread = visible.length <= 1 ? [225] : visible.map((_, i) => 160 + (i * (330 - 160)) / (visible.length - 1));
  visible.forEach(([l, r], i) => {
    const y = ySpread[i] ?? 225;
    prims.push(
      { k: "chip", text: l, x: 230, y, order: 2 + i * 2 },
      { k: "arrow", from: { x: 320, y }, to: { x: 480, y }, order: 2 + i * 2 + 1 },
      { k: "chip", text: r, x: 570, y, tone: "accent", order: 2 + i * 2 + 1 },
    );
  });
  if (dropped > 0) prims.push({ k: "caption", text: `+${dropped} more`, x: 400, y: 390, order: 2 + visible.length * 2 });
  return { prims };
}

/** branch: root chip left, N branch chips right, one arrow per branch */
export function buildBranchScene(d: DiagramInput): Scene {
  const prims: P[] = [...header(d)];
  const branches = d.labels.length ? d.labels : d.items.length ? d.items : ["branch"];
  prims.push({ k: "chip", text: d.genre, x: 190, y: 225, tone: "accent", order: 2 });
  const ySpread = branches.length <= 1
    ? [225]
    : branches.map((_, i) => 130 + (i * (330 - 130)) / (branches.length - 1));
  branches.forEach((b, i) => {
    const y = ySpread[i] ?? 225;
    prims.push(
      { k: "arrow", from: { x: 280, y: 225 }, to: { x: 490, y }, order: 3 + i },
      { k: "chip", text: b, x: 580, y, order: 3 + i },
    );
  });
  if (d.caption) prims.push({ k: "caption", text: d.caption, x: 400, y: 400, order: 3 + branches.length });
  return { prims };
}

// Re-export VIEW so consumers don't need a second import
export { VIEW };
