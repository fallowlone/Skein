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

// Re-export VIEW so consumers don't need a second import
export { VIEW };
