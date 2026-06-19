import { describe, it, expect } from "vitest";
import { h } from "preact";
import { renderToString } from "preact-render-to-string";
import { writeFileSync, readFileSync } from "node:fs";
import { GrammarDiagram } from "~/components/english/GrammarDiagram";
import { ARCHETYPE_BUILDERS } from "~/english/animations/archetype-map";
import type { DiagramInput } from "~/english/animations/editorial/diagram-input";

const inp = (o: Partial<DiagramInput>): DiagramInput =>
  ({ archetype: "arc", family: "general", genre: "X", labels: [], items: [], ...o } as unknown as DiagramInput);

const samples: Array<{ kind: string; in: Partial<DiagramInput> }> = [
  { kind: "arc", in: { genre: "present perfect", hero: "shipped", labels: ["past", "now", "future"], caption: "it's live now" } },
  { kind: "timeline", in: { genre: "request lifecycle", labels: ["accept", "parse", "route", "respond"] } },
  { kind: "contrast-pair", in: { genre: "consistency", labels: ["strong", "eventual"] } },
  { kind: "transformation", in: { genre: "compile", labels: ["source", "bytecode"] } },
  { kind: "map", in: { genre: "status", items: ["200→OK", "404→Not Found", "503→Unavailable"] } },
  { kind: "branch", in: { genre: "balancer", labels: ["node A", "node B", "node C"] } },
  { kind: "scale", in: { genre: "cache tiers", labels: ["disk", "RAM", "CPU L1"] } },
  { kind: "highlight", in: { genre: "hot path", labels: ["recv", "decode", "compute", "encode", "send"], focus: 2 } },
  { kind: "slot-fill", in: { genre: "pipeline gap", labels: ["extract", "___", "load"] } },
  { kind: "swap", in: { genre: "blue-green", labels: ["blue (live)", "green (idle)"] } },
];

function render(kind: string, partial: Partial<DiagramInput>): string {
  const builder = ARCHETYPE_BUILDERS[kind];
  if (!builder) throw new Error(`no builder for ${kind}`);
  const scene = builder(inp(partial));
  return renderToString(h(GrammarDiagram, { scene, label: `${kind} diagram`, reducedMotion: true }));
}

describe("EditorialDiagram static render (island-free proof)", () => {
  it("every archetype renders a static 800×450 SVG with NO hydration island", () => {
    for (const s of samples) {
      const html = render(s.kind, s.in);
      expect(html, s.kind).toContain('viewBox="0 0 800 450"');
      expect(html, s.kind).not.toContain("astro-island");
      expect(html, s.kind).toContain("gdiagram reduced"); // reduced-motion final frame
    }
  });

  it("arc archetype renders the dashed retrospective arc", () => {
    const html = render("arc", samples[0].in);
    expect(html).toContain("gd-arc");
    expect(html).toContain("<path"); // the quadratic arc path
  });

  it("dumps a visual preview to /tmp/editorial-preview.html", () => {
    const css = readFileSync("src/components/english/grammar-diagram.css", "utf8");
    const blocks = samples
      .map((s) => `<section><h2>${s.kind}</h2>${render(s.kind, s.in)}</section>`)
      .join("\n");
    const page = `<!doctype html><meta charset="utf-8"><style>${css}
      body{max-width:880px;margin:0 auto;padding:32px;font-family:system-ui}
      h2{font-family:ui-monospace,monospace;font-size:13px;color:#555;margin-top:40px}
      .gdiagram{width:100%;height:auto;border:0.5px solid #ddd;border-radius:8px}</style>
      <h1>Editorial diagram preview</h1>${blocks}`;
    writeFileSync("/tmp/editorial-preview.html", page);
    expect(page.length).toBeGreaterThan(1000);
  });
});
