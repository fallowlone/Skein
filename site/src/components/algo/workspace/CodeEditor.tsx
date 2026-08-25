// Purpose-built inline editor for the workspace: a textarea for real input plus a
// <pre> overlay for syntax color, sharing one scroll position. Deliberately not
// CodeMirror (as CodeDrawer.tsx uses for the docked modal editor) — this editor
// lives inline in the page layout with its own gutter, color scheme, and
// tab-completion vocabulary, matching the source design.
import { useRef, useState } from "preact/hooks";
import { currentToken, tokenize, type Token } from "./mastery";

export type Scheme = "ink" | "paper" | "slate";

const SCHEME_COLORS: Record<Scheme, { bg: string; plain: string; kw: string; str: string; num: string; com: string; fn: string }> = {
  ink: { bg: "var(--code-bg)", plain: "var(--code-ink)", kw: "var(--accent)", str: "var(--ok)", num: "var(--warn)", com: "var(--muted)", fn: "var(--code-ink)" },
  paper: { bg: "#fbf7eb", plain: "#1a1916", kw: "oklch(48% 0.13 250)", str: "oklch(45% 0.10 150)", num: "oklch(50% 0.13 60)", com: "#8a8474", fn: "#2d2b25" },
  slate: { bg: "#0f1014", plain: "#ece8dc", kw: "oklch(75% 0.12 230)", str: "oklch(75% 0.14 150)", num: "oklch(82% 0.13 75)", com: "#6f6a5e", fn: "#d7d2c2" },
};

const VOCAB = [
  "nums", "length", "sort", "push", "continue", "while", "return", "const", "let",
  "left", "right", "sum", "out", "Math.min", "Math.max", "Set", "Map", "indexOf", "includes",
  "slice", "splice", "filter", "reduce", "forEach", "Number.isInteger", "JSON.stringify",
];

function colorFor(scheme: Scheme, kind: Token["kind"]): string {
  const c = SCHEME_COLORS[scheme];
  return kind === "plain" ? c.plain : c[kind];
}

type Props = {
  code: string;
  onChange: (code: string) => void;
  scheme: Scheme;
  completionsHint: string;
  completionsPrompt: string;
};

export default function CodeEditor({ code, onChange, scheme, completionsHint, completionsPrompt }: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [caret, setCaret] = useState(0);

  const lines = code.split("\n");
  const gutter = lines.map((_, i) => String(i + 1)).join("\n");
  const tok = currentToken(code, caret);
  const matches = tok.length >= 2
    ? VOCAB.filter((v) => v.toLowerCase().startsWith(tok.toLowerCase()) && v !== tok).slice(0, 6)
    : [];
  const upto = code.slice(0, caret).split("\n");
  const cursorLine = upto.length;
  const cursorCol = (upto.at(-1) ?? "").length + 1;
  const bg = SCHEME_COLORS[scheme].bg;

  function accept(word: string) {
    const start = caret - tok.length;
    const next = code.slice(0, start) + word + code.slice(caret);
    const pos = start + word.length;
    onChange(next);
    setCaret(pos);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const first = matches[0];
    if (first) { accept(first); return; }
    const el = e.currentTarget as HTMLTextAreaElement;
    const at = el.selectionStart;
    const next = code.slice(0, at) + "  " + code.slice(el.selectionEnd);
    onChange(next);
    setCaret(at + 2);
    requestAnimationFrame(() => taRef.current?.setSelectionRange(at + 2, at + 2));
  }

  function syncScroll(e: Event) {
    const el = e.currentTarget as HTMLTextAreaElement;
    if (preRef.current) { preRef.current.scrollTop = el.scrollTop; preRef.current.scrollLeft = el.scrollLeft; }
    if (gutRef.current) gutRef.current.scrollTop = el.scrollTop;
  }

  return (
    <div>
      <div style={`background:${bg};border-bottom:0.5px solid var(--rule);display:grid;grid-template-columns:52px minmax(0,1fr)`}>
        <div ref={gutRef} style="height:396px;box-sizing:border-box;padding:16px 0;border-right:0.5px solid var(--rule);text-align:right;user-select:none;overflow:hidden">
          <pre style="margin:0;padding:0 12px 0 0;font-family:var(--font-mono);font-size:13px;line-height:1.75;color:var(--muted);opacity:0.7"><code>{gutter}</code></pre>
        </div>
        <div style="position:relative;height:396px;min-width:0">
          <pre
            ref={preRef}
            aria-hidden="true"
            style="position:absolute;inset:0;margin:0;padding:16px 16px 16px 14px;overflow:hidden;font-family:var(--font-mono);font-size:13px;line-height:1.75;white-space:pre;tab-size:2;pointer-events:none"
          >
            <code>
              {lines.map((line, i) => (
                <span key={i}>
                  {tokenize(line).map((t, j) => (
                    <span key={j} style={`color:${colorFor(scheme, t.kind)}`}>{t.text}</span>
                  ))}
                  {i < lines.length - 1 ? "\n" : ""}
                </span>
              ))}
            </code>
          </pre>
          <textarea
            ref={taRef}
            spellcheck={false}
            value={code}
            onInput={(e) => { onChange((e.target as HTMLTextAreaElement).value); setCaret((e.target as HTMLTextAreaElement).selectionStart); }}
            onKeyDown={handleKeyDown}
            onSelect={(e) => setCaret((e.target as HTMLTextAreaElement).selectionStart)}
            onScroll={syncScroll}
            style="position:absolute;inset:0;width:100%;height:100%;box-sizing:border-box;margin:0;padding:16px 16px 16px 14px;border:0;outline:none;resize:none;background:transparent;color:transparent;caret-color:var(--accent);font-family:var(--font-mono);font-size:13px;line-height:1.75;white-space:pre;tab-size:2;overflow:auto"
          />
        </div>
      </div>

      <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:0.5px solid var(--rule);background:var(--card);min-height:34px;box-sizing:border-box">
        <span style="font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);flex:none">
          {matches.length ? completionsHint : completionsPrompt}
        </span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;min-width:0">
          {matches.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => accept(w)}
              style="appearance:none;cursor:pointer;background:transparent;border:0.5px solid var(--rule-strong);color:var(--ink);font-family:var(--font-mono);font-size:10.5px;padding:2px 6px;border-radius:1px;transition:background 120ms var(--ease)"
            >
              {w}
            </button>
          ))}
        </div>
        <span style="flex:1" />
        <span style="font-family:var(--font-mono);font-size:9.5px;color:var(--muted);font-variant-numeric:tabular-nums;flex:none">
          ln {cursorLine} · col {cursorCol}
        </span>
      </div>
    </div>
  );
}
