import { useEffect, useRef } from "preact/hooks";
import { PATTERNS, clamp01, type PatternKind } from "./poster-patterns";

export type PosterStep = { caption: string; state: string; log: string };
export type Mini = { title: string; body: string; tone?: 0 | 1 | 2 | 3; at?: number };

type Props = {
  id: string;
  lang: "en" | "ru";
  kicker: string;
  lessonTag: string;
  cost: string;
  title: string;
  titleHi?: string[];
  sub: string;
  badges: string[];
  panelTitle: string;
  label: string;
  pattern: PatternKind;
  data: Record<string, any>;
  steps: PosterStep[];
  minis: Mini[];
  takeaway: string;
  src: string;
};

const UI = {
  en: { pause: "⏸ pause", play: "▶ play", step: "step ▸", replay: "⟲ replay", slow: "0.5× slow", slowOn: "0.5× slow · on", log: "log.md — watch it happen", ready: "ready…" },
  ru: { pause: "⏸ пауза", play: "▶ играть", step: "шаг ▸", replay: "⟲ заново", slow: "0.5× медленно", slowOn: "0.5× медленно · вкл", log: "log.md — смотри вживую", ready: "готово…" },
} as const;

const BADGE_BG = ["#9be15d", "#ff9f43", "#ffe45e", "#c4b5fd"];
const MINI_BG = ["#e9fbe7", "#fff1de", "#fff9d6", "#ede9fe"];

const CSS = `
.aposter * { box-sizing: border-box; }
.aposter { background: #f6ecd2; border: 3px solid #111; box-shadow: 8px 8px 0 #111; color: #1a1a1a; font-family: 'IBM Plex Mono', ui-monospace, monospace; min-width: 0; }
.aposter .ap-topmeta { display: flex; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 11px; font-weight: 700; letter-spacing: .06em; padding: 8px 16px; border-bottom: 3px solid #111; text-transform: uppercase; }
.aposter .ap-hero { padding: 18px 20px 14px; border-bottom: 3px solid #111; }
.aposter .ap-hero h1 { font-family: 'Archivo Black', 'IBM Plex Mono', sans-serif; font-size: clamp(20px, 3.6vw, 34px); line-height: 1.15; letter-spacing: -0.01em; margin: 0; }
.aposter .ap-hl-g { background: #9be15d; padding: 0 8px; border: 2.5px solid #111; display: inline-block; transform: rotate(-.5deg); }
.aposter .ap-hl-o { background: #ff9f43; padding: 0 8px; border: 2.5px solid #111; display: inline-block; }
.aposter .ap-sub { margin: 10px 0 0; font-size: 13px; font-weight: 500; line-height: 1.55; max-width: 90ch; }
.aposter .ap-badges { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
.aposter .ap-badge { font-size: 11px; font-weight: 700; border: 2px solid #111; border-radius: 20px; padding: 3px 10px; box-shadow: 3px 3px 0 #111; }
.aposter .ap-grid { display: grid; gap: 26px; padding: 22px 14px 18px; }
.aposter .ap-panel { border: 3px solid #111; box-shadow: 5px 5px 0 #111; background: #fffdf4; position: relative; min-width: 0; }
.aposter .ap-ptitle { position: absolute; top: -15px; left: 16px; z-index: 2; font-size: 12px; font-weight: 700; border: 2.5px solid #111; padding: 2px 12px; letter-spacing: .04em; max-width: calc(100% - 32px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aposter .ap-body { padding: 26px 16px 16px; min-width: 0; }
.aposter svg.ap-loop { width: 100%; height: auto; display: block; }
.aposter .ap-controls { display: flex; gap: 10px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
.aposter button { font-family: inherit; font-weight: 700; font-size: 12px; border: 2.5px solid #111; background: #111; color: #f6ecd2; padding: 8px 16px; cursor: pointer; box-shadow: 3px 3px 0 rgba(0,0,0,.35); text-transform: uppercase; letter-spacing: .05em; }
.aposter button.ap-ghost { background: #fffdf4; color: #111; }
.aposter button.ap-active { background: #9be15d; color: #111; }
.aposter button:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 rgba(0,0,0,.35); }
.aposter .ap-dots { display: flex; gap: 6px; }
.aposter .ap-dots span { width: 26px; height: 10px; border: 2px solid #111; background: #fff; transition: background .45s; }
.aposter .ap-dots span.on { background: #111; }
.aposter .ap-two { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; min-width: 0; }
.aposter .ap-small { font-size: 11.5px; color: #333; line-height: 1.6; overflow-wrap: anywhere; }
.aposter #ap-caption { min-height: 1.6em; }
@media(max-width: 900px){ .aposter .ap-two { grid-template-columns: 1fr; } }
.aposter .ap-mini { border: 2.5px solid #111; padding: 10px 12px; font-size: 12.5px; line-height: 1.55; box-shadow: 4px 4px 0 #111; min-width: 0; overflow-wrap: anywhere; transition: transform .45s ease, box-shadow .45s ease; }
.aposter .ap-mini b.ap-k { display: block; font-size: 12px; letter-spacing: .05em; margin-bottom: 4px; }
.aposter .ap-mini.ap-on { transform: translate(-2px,-2px) rotate(-.4deg); box-shadow: 7px 7px 0 #111; }
.aposter .ap-term { background: #111; color: #e8e8e8; border: 3px solid #111; box-shadow: 5px 5px 0 rgba(0,0,0,.3); font-size: 12px; padding: 12px 14px; min-height: 132px; line-height: 1.65; overflow-wrap: anywhere; white-space: pre-wrap; word-break: break-word; }
.aposter .ap-term .ap-caret::after { content: '▊'; animation: apblink 1.2s steps(1) infinite; }
.aposter .ap-logline { animation: apfade .6s ease both; overflow-wrap: anywhere; }
@keyframes apblink { 50% { opacity: 0; } }
@keyframes apfade { from { opacity: 0; transform: translateY(4px);} to { opacity: 1; transform: none;} }
@keyframes apdash { to { stroke-dashoffset: -24; } }
.aposter .ap-flow { stroke-dasharray: 6 6; animation: apdash 2.8s linear infinite; }
.aposter .ap-xfade { transition: fill .45s ease, opacity .45s ease, stroke .45s ease, stroke-width .45s ease; }
.aposter .ap-footer { border-top: 3px solid #111; background: #111; color: #f6ecd2; padding: 12px 16px; font-size: 11.5px; line-height: 1.6; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; overflow-wrap: anywhere; }
@media (prefers-reduced-motion: reduce) { .aposter .ap-flow, .aposter .ap-term .ap-caret::after { animation: none; } }
`;

function hiTitle(title: string, his?: string[]) {
  if (!his || his.length === 0) return title;
  let parts: (string | { h: string; k: number })[] = [title];
  his.forEach((h, k) => {
    const next: typeof parts = [];
    for (const p of parts) {
      if (typeof p !== "string") {
        next.push(p);
        continue;
      }
      const i = p.indexOf(h);
      if (i < 0) {
        next.push(p);
        continue;
      }
      if (i > 0) next.push(p.slice(0, i));
      next.push({ h, k });
      if (i + h.length < p.length) next.push(p.slice(i + h.length));
    }
    parts = next;
  });
  return parts.map((p, i) =>
    typeof p === "string" ? <span key={i}>{p}</span> : <span key={i} class={p.k % 2 === 0 ? "ap-hl-g" : "ap-hl-o"}>{p.h}</span>,
  );
}

export default function AlgoPoster(props: Props) {
  const { id, lang, steps, minis, data, pattern } = props;
  const ui = UI[lang];
  const rootRef = useRef<HTMLElement>(null);
  const N = steps.length;
  const pat = PATTERNS[pattern];

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !pat) return;
    let D = 9000;
    const HOLD = 1700;
    const SLOW_D = 16000;
    let slowMode = false;
    const loopLen = () => D + HOLD;
    let start = performance.now();
    let playing = true;
    let stepLock = -1;
    let logged = -1;
    let displayT = 0;
    let progressOffset = 0;
    let tween: { from: number; delta: number; t0: number; dur: number } | null = null;
    let raf = 0;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) playing = false;

    const badge = root.querySelector("[data-ap=badge]");
    const cap = root.querySelector("[data-ap=caption]");
    const dots = Array.from(root.querySelectorAll("[data-ap=dots] span"));
    const cards = Array.from(root.querySelectorAll("[data-ap=mini]"));
    const logLines = root.querySelector("[data-ap=log]");
    const playBtn = root.querySelector<HTMLButtonElement>("[data-ap=play]");
    const stepBtn = root.querySelector<HTMLButtonElement>("[data-ap=step]");
    const replayBtn = root.querySelector<HTMLButtonElement>("[data-ap=replay]");
    const slowBtn = root.querySelector<HTMLButtonElement>("[data-ap=slow]");
    const svg = root.querySelector("[data-ap=stage]");

    const idxFor = (tt: number) => Math.min(N - 1, Math.max(0, Math.floor(Math.min(tt, N - 0.0001))));

    function setStep(i: number) {
      if (i === stepLock) return;
      stepLock = i;
      if (badge) badge.textContent = steps[i].state;
      if (cap) cap.textContent = steps[i].caption;
      dots.forEach((d, j) => d.classList.toggle("on", j <= i));
      cards.forEach((c) => {
        const at = c.getAttribute("data-at");
        c.classList.toggle("ap-on", at !== null && Number(at) === i);
      });
    }
    function pushLog(i: number) {
      if (i === logged || !logLines) return;
      logged = i;
      const div = document.createElement("div");
      div.className = "ap-logline";
      div.textContent = "> " + steps[i].log;
      logLines.appendChild(div);
      while (logLines.children.length > 4 && logLines.firstChild) logLines.removeChild(logLines.firstChild);
    }
    function frame(now: number) {
      if (playing) {
        const p = ((((now - start) % loopLen()) + loopLen()) % loopLen()) / D;
        const tt = Math.min(p, 1) * N;
        displayT = tt;
        if (svg) pat.pose(tt, N, data, svg);
        const idx = idxFor(tt);
        setStep(idx);
        pushLog(idx);
      } else if (tween && svg) {
        const k = clamp01((now - tween.t0) / tween.dur);
        const e = -(Math.cos(Math.PI * k) - 1) / 2;
        const tt = (tween.from + tween.delta * e) % N;
        displayT = tt;
        progressOffset = (tt / N) * D;
        pat.pose(tt, N, data, svg);
        const idx = idxFor(tt);
        setStep(idx);
        pushLog(idx);
        if (k >= 1) {
          start = now - progressOffset;
          tween = null;
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function renderPlay() {
      if (playBtn) playBtn.textContent = playing ? ui.pause : ui.play;
    }
    renderPlay();
    raf = requestAnimationFrame(frame);
    playBtn?.addEventListener("click", () => {
      if (playing) {
        progressOffset = (displayT / N) * D;
        tween = null;
      } else {
        start = performance.now() - progressOffset;
      }
      playing = !playing;
      renderPlay();
    });
    replayBtn?.addEventListener("click", () => {
      tween = null;
      displayT = 0;
      start = performance.now();
      progressOffset = 0;
      if (logLines) logLines.innerHTML = "";
      logged = -1;
      stepLock = -1;
      if (!playing) {
        playing = true;
        renderPlay();
      }
    });
    stepBtn?.addEventListener("click", () => {
      const next = (stepLock + 1 + N) % N;
      if (playing) {
        progressOffset = (displayT / N) * D;
        playing = false;
        renderPlay();
      }
      const cur = displayT;
      const target = (next + 0.6) / N;
      const delta = ((((target - cur) % N) + N) % N) || N;
      const dur = (900 + (delta / N) * 3000) * (D / 9000);
      tween = { from: cur, delta, t0: performance.now(), dur };
    });
    slowBtn?.addEventListener("click", () => {
      slowMode = !slowMode;
      const now = performance.now();
      const curP = playing ? displayT / N : progressOffset / D;
      D = slowMode ? SLOW_D : 9000;
      start = now - curP * D;
      progressOffset = curP * D;
      if (slowBtn) {
        slowBtn.classList.toggle("ap-active", slowMode);
        slowBtn.textContent = slowMode ? ui.slowOn : ui.slow;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [id]);

  if (!pat) return null;

  return (
    <figure ref={rootRef} data-lesson-visual class="aposter" style="margin:28px 0;" role="group" aria-label={props.label}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Mono:wght@400;500;700&display=swap');${CSS}`}</style>
      <div class="ap-topmeta">
        <span>{props.kicker}</span>
        <span>{props.lessonTag}</span>
        <span>{props.cost}</span>
      </div>
      <div class="ap-hero">
        <h1>{hiTitle(props.title, props.titleHi)}</h1>
        <p class="ap-sub">{props.sub}</p>
        <div class="ap-badges">
          {props.badges.map((b, i) => (
            <span key={i} class="ap-badge" style={`background:${BADGE_BG[i % BADGE_BG.length]}`}>{b}</span>
          ))}
          <span class="ap-badge" style="background:#111;color:#f6ecd2" data-ap="badge">{steps[0].state}</span>
        </div>
      </div>
      <div class="ap-grid">
        <div class="ap-panel">
          <div class="ap-ptitle" style="background:#111;color:#f6ecd2">{props.panelTitle}</div>
          <div class="ap-body">
            <div data-ap="stage" role="img" aria-label={props.label}>
              <svg class="ap-loop" viewBox="0 0 980 360" font-family="IBM Plex Mono, monospace">{pat.render(data)}</svg>
            </div>
            <div class="ap-controls">
              <button data-ap="play">{ui.pause}</button>
              <button class="ap-ghost" data-ap="step">{ui.step}</button>
              <button class="ap-ghost" data-ap="replay">{ui.replay}</button>
              <button class="ap-ghost" data-ap="slow" title="toggle slow motion">{ui.slow}</button>
              <div class="ap-dots" data-ap="dots">{steps.map((_, i) => <span key={i} />)}</div>
              <span class="ap-small" id={`ap-caption-${id}`} data-ap="caption" aria-live="polite">{ui.ready}</span>
            </div>
          </div>
        </div>
        <div class="ap-two">
          {minis.map((m, i) => (
            <div key={i} class="ap-mini" data-ap="mini" data-at={m.at !== undefined ? String(m.at) : undefined} style={`background:${MINI_BG[(m.tone ?? i) % MINI_BG.length]}`}>
              <b class="ap-k">{m.title}</b>
              {m.body}
            </div>
          ))}
        </div>
        <div class="ap-panel">
          <div class="ap-ptitle" style="background:#111;color:#f6ecd2">{ui.log}</div>
          <div class="ap-body">
            <div class="ap-term">
              <div>&gt; {id} --live</div>
              <div data-ap="log" />
              <div class="ap-caret">&gt; </div>
            </div>
          </div>
        </div>
      </div>
      <div class="ap-footer"><span>{props.takeaway}</span><span>{props.src}</span></div>
    </figure>
  );
}
