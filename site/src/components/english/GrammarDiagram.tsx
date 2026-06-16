import "./grammar-diagram.css";
import type { Scene, Prim, Pt } from "~/english/animations/editorial/scene-types";
import type { Lang } from "~/types/index";

type Props = { scene: Scene; reducedMotion?: boolean; lang: Lang };

// Arrowhead marker id — unique to avoid clashing with other SVG markers on the page.
const MARKER_ID = "gd-arrow";
const GRID_ID = "gd-grid";
const NODE_R = 7;
const CHIP_H = 32;
const CHIP_PAD = 14;
const TICK_H = 8;
const CHIP_DEFAULT_W = 100;

/**
 * Compute a font-size that keeps `text` within `maxPx` SVG units.
 * Uses a simple character-count heuristic (assumes average char ≈ baseFontSize * 0.6 wide),
 * clamped to [minFontSize, baseFontSize].
 */
function fitFontSize(
  text: string,
  maxPx: number,
  baseFontSize: number,
  minFontSize: number,
): number {
  const avgCharWidth = baseFontSize * 0.6;
  const fitsAtBase = Math.floor(maxPx / avgCharWidth);
  const len = text.length;
  if (len <= fitsAtBase) return baseFontSize;
  const scaled = Math.floor((baseFontSize * fitsAtBase) / len);
  return Math.max(scaled, minFontSize);
}

/**
 * Return `textLength` and `lengthAdjust` props when the text still risks
 * overflowing at the given font size (backstop using a tighter char-width estimate).
 */
function backstopLength(
  text: string,
  maxPx: number,
  fontSize: number,
): { textLength?: number; lengthAdjust?: "spacingAndGlyphs" } {
  const estimated = text.length * fontSize * 0.62;
  if (estimated <= maxPx) return {};
  return { textLength: Math.floor(maxPx), lengthAdjust: "spacingAndGlyphs" };
}

function midLift(from: Pt, to: Pt, lift: number): Pt {
  return {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2 - lift,
  };
}

function renderPrim(p: Prim & { order?: number }, idx: number) {
  const o = p.order ?? idx;
  const stagger: preact.JSX.CSSProperties = { "--o": o } as preact.JSX.CSSProperties;

  switch (p.k) {
    case "genre": {
      // genre is left-anchored at p.x; allow up to x=760 from its anchor.
      const gBase = 11;
      const gMin = 9;
      const gMax = Math.max(760 - p.x, 80);
      const genreText = p.text.toUpperCase();
      const genreFs = fitFontSize(genreText, gMax, gBase, gMin);
      const genreBackstop = backstopLength(genreText, gMax, genreFs);
      return (
        <text
          key={`genre-${idx}`}
          x={p.x}
          y={p.y}
          class="gd-genre gd-reveal"
          style={{ ...stagger, fontSize: `${genreFs}px` }}
          {...genreBackstop}
        >
          {genreText}
        </text>
      );
    }

    case "formula": {
      // formula is centered at x=400; max usable width ~700px (50px margin each side).
      const fBase = 13;
      const fMin = 9;
      const fMax = 700;
      const formulaFs = fitFontSize(p.text, fMax, fBase, fMin);
      const formulaBackstop = backstopLength(p.text, fMax, formulaFs);
      return (
        <text
          key={`formula-${idx}`}
          x={p.x}
          y={p.y}
          text-anchor="middle"
          class="gd-formula gd-reveal"
          style={{ ...stagger, fontSize: `${formulaFs}px` }}
          {...formulaBackstop}
        >
          {p.text}
        </text>
      );
    }

    case "axis": {
      const markerAttr = p.arrow ? MARKER_ID : undefined;
      return (
        <line
          key={`axis-${idx}`}
          x1={p.x0}
          y1={p.y}
          x2={p.x1}
          y2={p.y}
          class="gd-axis gd-draw"
          style={stagger}
          marker-end={markerAttr ? `url(#${markerAttr})` : undefined}
        />
      );
    }

    case "arc": {
      const ctrl = midLift(p.from, p.to, p.lift);
      const d = `M ${p.from.x} ${p.from.y} Q ${ctrl.x} ${ctrl.y} ${p.to.x} ${p.to.y}`;
      return (
        <path
          key={`arc-${idx}`}
          d={d}
          class="gd-arc gd-draw"
          style={stagger}
          fill="none"
        />
      );
    }

    case "node": {
      const r = (p.d ?? NODE_R * 2) / 2;
      return (
        <circle
          key={`node-${idx}`}
          cx={p.x}
          cy={p.y}
          r={r}
          class={`gd-node gd-node--${p.fill} gd-reveal`}
          style={stagger}
        />
      );
    }

    case "dropLine":
      return (
        <line
          key={`dropLine-${idx}`}
          x1={p.x}
          y1={p.y0}
          x2={p.x}
          y2={p.y1}
          class="gd-dropline gd-reveal"
          style={stagger}
        />
      );

    case "tick":
      return (
        <g key={`tick-${idx}`} class="gd-reveal" style={stagger}>
          <line
            x1={p.x}
            y1={p.y - TICK_H}
            x2={p.x}
            y2={p.y + TICK_H}
            class="gd-tick-mark"
          />
          {p.label && (
            <text
              x={p.x}
              y={p.y + TICK_H + 16}
              text-anchor="middle"
              class="gd-tick-label"
            >
              {p.label}
            </text>
          )}
        </g>
      );

    case "label":
      return (
        <text
          key={`label-${idx}`}
          x={p.x}
          y={p.y}
          text-anchor="middle"
          class={`gd-label gd-label--${p.weight ?? "mono"} gd-reveal`}
          style={stagger}
        >
          {p.text}
        </text>
      );

    case "hero":
      return (
        <text
          key={`hero-${idx}`}
          x={p.x}
          y={p.y}
          class="gd-hero gd-reveal"
          style={stagger}
        >
          {p.text}
        </text>
      );

    case "caption":
      return (
        <text
          key={`caption-${idx}`}
          x={p.x}
          y={p.y}
          text-anchor="middle"
          class="gd-caption gd-reveal"
          style={stagger}
        >
          {p.text}
        </text>
      );

    case "chip": {
      const w = p.w ?? CHIP_DEFAULT_W;
      const tone = p.tone ?? "ink";
      // chip text must fit within (w - 2*CHIP_PAD) horizontal space.
      const cBase = 12;
      const cMin = 9;
      const cMax = Math.max(w - CHIP_PAD * 2, 20);
      const chipFs = fitFontSize(p.text, cMax, cBase, cMin);
      const chipBackstop = backstopLength(p.text, cMax, chipFs);
      return (
        <g key={`chip-${idx}`} class={`gd-chip gd-chip--${tone} gd-reveal`} style={stagger}>
          <rect
            x={p.x - w / 2}
            y={p.y - CHIP_H / 2}
            width={w}
            height={CHIP_H}
            rx={6}
            class="gd-chip-rect"
          />
          <text
            x={p.x}
            y={p.y + 5}
            text-anchor="middle"
            class="gd-chip-text"
            style={{ fontSize: `${chipFs}px` }}
            {...chipBackstop}
          >
            {p.text}
          </text>
        </g>
      );
    }

    case "arrow":
      return (
        <line
          key={`arrow-${idx}`}
          x1={p.from.x}
          y1={p.from.y}
          x2={p.to.x}
          y2={p.to.y}
          class="gd-arrow gd-reveal"
          style={stagger}
          marker-end={`url(#${MARKER_ID})`}
        />
      );

    case "divider":
      return (
        <line
          key={`divider-${idx}`}
          x1={p.x}
          y1={p.y0}
          x2={p.x}
          y2={p.y1}
          class="gd-divider gd-reveal"
          style={stagger}
        />
      );

    case "pulse":
      return (
        <rect
          key={`pulse-${idx}`}
          x={p.x - p.w / 2}
          y={p.y}
          width={p.w}
          height={3}
          rx={1.5}
          class="gd-pulse"
          style={stagger}
        />
      );

    default:
      // Exhaustiveness guard — TypeScript will error if a Prim variant is unhandled.
      return null;
  }
}

export function GrammarDiagram({ scene, reducedMotion = false }: Props) {
  const rootClass = ["gdiagram", reducedMotion ? "reduced" : ""].filter(Boolean).join(" ");

  return (
    <svg
      viewBox="0 0 800 450"
      xmlns="http://www.w3.org/2000/svg"
      class={rootClass}
      role="img"
      aria-label="Grammar diagram"
    >
      <defs>
        {/* Arrowhead marker */}
        <marker
          id={MARKER_ID}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" class="gd-marker-fill" />
        </marker>

        {/* Paper grid pattern */}
        <pattern
          id={GRID_ID}
          width="26"
          height="26"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 26 0 L 0 0 0 26"
            fill="none"
            class="gd-grid-line"
            stroke-width="0.5"
          />
        </pattern>
      </defs>

      {/* Paper background */}
      <rect width="800" height="450" class="gd-bg" />

      {/* Grid overlay */}
      <rect width="800" height="450" fill={`url(#${GRID_ID})`} class="gd-grid-overlay" />

      {/* Primitives */}
      {scene.prims.map((p, i) => renderPrim(p, i))}
    </svg>
  );
}

export default GrammarDiagram;
