// Small style-string builders, mirroring the source design's own tabStyle/navStyle/
// chipStyle helpers. Preact accepts `style` as a plain CSS string (unlike React), so
// these stay direct string builders instead of style-object indirection. All colors
// route through the site's real global tokens (tokens.css) — no parallel palette.

export function tabStyle(active: boolean): string {
  return `appearance:none;cursor:pointer;border:0;border-bottom:2px solid ${active ? "var(--ink)" : "transparent"};` +
    `background:transparent;color:${active ? "var(--ink)" : "var(--muted)"};` +
    `font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;` +
    `padding:10px 14px;margin-bottom:-0.5px;transition:color 120ms var(--ease),border-color 120ms var(--ease)`;
}

export function navStyle(active: boolean): string {
  return `appearance:none;cursor:pointer;border:0.5px solid ${active ? "var(--ink)" : "transparent"};` +
    `background:${active ? "var(--ink)" : "transparent"};color:${active ? "var(--paper)" : "var(--ink-2)"};` +
    `font-family:var(--font-mono);font-size:10.5px;letter-spacing:0.08em;text-transform:uppercase;` +
    `padding:7px 12px;border-radius:1px;transition:background 120ms var(--ease),color 120ms var(--ease)`;
}

export function chipStyle(active: boolean): string {
  return `appearance:none;cursor:pointer;border:0.5px solid ${active ? "var(--ink)" : "var(--rule)"};` +
    `background:${active ? "var(--ink)" : "transparent"};color:${active ? "var(--paper)" : "var(--muted)"};` +
    `font-family:var(--font-mono);font-size:10.5px;padding:4px 9px;border-radius:1px;` +
    `transition:border-color 120ms var(--ease),background 120ms var(--ease)`;
}

export function ghostButtonStyle(): string {
  return "appearance:none;cursor:pointer;background:transparent;border:0.5px solid var(--rule-strong);" +
    "color:var(--ink-2);font-family:var(--font-mono);font-size:10px;letter-spacing:0.08em;" +
    "text-transform:uppercase;padding:7px 10px;border-radius:1px;" +
    "transition:border-color 120ms var(--ease),color 120ms var(--ease)";
}

export const monoLabel =
  "font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted)";
export const monoLabelInk =
  "font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.08em;text-transform:uppercase;color:var(--ink);font-weight:500";
export const sectionRule = "border-top:0.5px solid var(--rule-strong);border-bottom:0.5px solid var(--rule-strong)";
