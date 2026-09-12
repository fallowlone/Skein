import { Button as ShadcnButton } from "~/components/ui/button";
import { useLayoutEffect, useState } from "preact/hooks";
import type { Locale } from "~/i18n";

const ROUTE = [
  { key: "two", top: "TWO", bottom: "POINTERS", en: <>Algorithms:<br /><span style="white-space:nowrap">Two Pointers</span></>, ru: <>RU: Алгоритмы:<br />Два указателя</> },
  { key: "slide", top: "SLIDING", bottom: "WINDOW", en: <>Sliding<br />Window</>, ru: <>RU: Скользящее<br />окно</> },
  { key: "search", top: "BINARY", bottom: "SEARCH", en: <>Binary<br />Search</>, ru: <>RU: Двоичный<br />поиск</> },
  { key: "graph", top: "GRAPHS", bottom: "", en: <>Graphs</>, ru: <>RU: Графы</> },
] as const;

function RouteIcon({ kind }: { kind: (typeof ROUTE)[number]["key"] }) {
  if (kind === "two") return <>
    <path d="M6.5 23 13 10l3.2 6.3L20 9l5.5 14H6.5Z" />
    <path class="ep-icon-left" d="m5.5 15 3-3m-3 3 3 3M8.5 15h6" />
    <path class="ep-icon-right" d="m26.5 15-3-3m3 3-3 3M23.5 15h-5" />
  </>;
  if (kind === "slide") return <>
    <path class="ep-icon-wave" d="M5.5 10.5c3.4-4.4 5.4 4.4 8.8 0s5.4 4.4 8.8 0 3.2-1.8 3.4-2" />
    <path d="M6 19h20M6 23.5h20" />
    <path class="ep-icon-window" d="M10 17v8.5M20 17v8.5" />
  </>;
  if (kind === "search") return <>
    <g class="ep-icon-lens"><circle cx="13" cy="13" r="7.5" /><circle cx="13" cy="13" r="3.2" stroke-dasharray="1.3 2" /><path d="M13 8.5v2M8.5 13h2" /></g>
    <path class="ep-icon-handle" d="m18.7 18.7 7.1 7.1m-3.5-3.5 2.2-2.2" />
  </>;
  return <>
    <path class="ep-icon-edges" d="m8 10 13-3m3 14-14 3M8 10l2 14M21 7l3 14M8.8 11.2 14.1 9M20 8.3 11 22.8" />
    <circle class="ep-icon-node ep-icon-node-1" cx="8" cy="10" r="2.7" />
    <circle class="ep-icon-node ep-icon-node-2" cx="21" cy="7" r="2.7" />
    <circle class="ep-icon-node ep-icon-node-3" cx="24" cy="21" r="2.7" />
    <circle class="ep-icon-node ep-icon-node-4" cx="10" cy="24" r="2.7" />
  </>;
}

type Props = {
  lang: Locale;
  telegramStarsUrl: string | null;
  routeCounts: Record<string, number>;
  onOpenPattern: (pattern: string) => void;
  onDismiss: () => void;
};

export default function ExpeditionPass({ lang, telegramStarsUrl, routeCounts, onOpenPattern, onDismiss }: Props) {
  const [open, setOpen] = useState(true);

  function dismiss() {
    onDismiss();
    setOpen(false);
  }

  function openPattern(pattern: string) {
    onOpenPattern(pattern);
    setOpen(false);
  }

  useLayoutEffect(() => {
    const body = document.body;
    if (open) body.dataset.expeditionPass = "open";
    else delete body.dataset.expeditionPass;
    return () => { delete body.dataset.expeditionPass; };
  }, [open]);

  if (!open) return null;

  return (
    <aside class="expedition-pass" aria-label="Patron Map">
      <ShadcnButton class="ep-close" type="button" aria-label="Close Expedition Pass" onClick={dismiss}>×</ShadcnButton>

      <svg class="ep-compass" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="13" /><circle cx="16" cy="16" r="9.5" stroke-dasharray="1.2 2.1" />
        <path d="m20.8 10.8-3.1 7-6.5 3.4 3.1-7Z" fill="currentColor" /><circle cx="16" cy="16" r="1.6" fill="var(--paper)" />
      </svg>

      <h2>Fund a track.<br />Leave a mark.</h2>
      <p class="ep-ru ep-intro-ru">RU: Поддержите направление и оставьте свой след</p>

      <div class="ep-route" aria-label="Patron map tracks">
        {ROUTE.map((item) => (
          <ShadcnButton
            class="ep-route-step"
            key={item.key}
            type="button"
            aria-label={`${lang === "ru" ? "Открыть задачи" : "Open problems"}: ${item.top} ${item.bottom}`}
            onClick={() => openPattern(item.key === "two" ? "two-pointers" : item.key === "slide" ? "sliding-window" : item.key === "search" ? "binary-search" : "graphs")}
          >
            <div class={`ep-stamp ep-stamp-${item.key}`}>
              <span>{item.top}</span>
              <svg viewBox="0 0 32 32" aria-hidden="true"><RouteIcon kind={item.key} /></svg>
              <span>{item.bottom}</span>
            </div>
            <p class="ep-route-en">{item.en}</p>
            <p class="ep-ru ep-route-ru">{item.ru}</p>
          </ShadcnButton>
        ))}
      </div>

      <ShadcnButton class="ep-week" type="button" onClick={() => openPattern("two-pointers")}>
        <span class="ep-flag" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M11 26V7m0 2h12l-3 4 3 4H11" /></svg>
        </span>
        <div>
          <h3>Week 1: Two Pointers</h3>
          <p>{routeCounts["two-pointers"] ?? 0} problems in the live bank</p>
        </div>
        <p class="ep-ru">RU: Неделя 1: Два указателя — {routeCounts["two-pointers"] ?? 0} задач в банке</p>
      </ShadcnButton>

      <div class="ep-benefits">
        <p>Choose a track to help shape Skein’s curriculum. Your support funds deeper lessons, examples, and practice paths.</p>
        <p class="ep-ru">RU: Выберите направление, чтобы поддержать развитие Skein. Поддержка помогает создавать новые уроки, примеры и практику.</p>
      </div>

      {telegramStarsUrl ? (
        <a class="ep-cta ep-cta-primary" href={telegramStarsUrl} rel="noopener noreferrer">
          <span>Support with Telegram Stars</span>
          <small>RU: Поддержать направление через Telegram Stars</small>
        </a>
      ) : (
        <>
          <ShadcnButton class="ep-cta ep-cta-primary" type="button" disabled aria-describedby="telegram-stars-unavailable">
            <span>Telegram Stars unavailable</span>
            <small>RU: Telegram Stars пока недоступны</small>
          </ShadcnButton>
          <p id="telegram-stars-unavailable" class="ep-support-note">
            {lang === "ru" ? "Платёжный endpoint не настроен." : "Patron payment endpoint is not configured."}
          </p>
        </>
      )}
      <ShadcnButton class="ep-cta ep-cta-secondary" type="button" onClick={dismiss}>
        <span>Continue without pass</span>
        <small>RU: Продолжить без поддержки</small>
      </ShadcnButton>

      <style>{`
        body[data-expedition-pass="open"] .rail,
        body[data-expedition-pass="open"] .rail-topbar { display:none !important; }
        body[data-expedition-pass="open"] .oa-main { margin-left:0 !important; }
        body[data-expedition-pass="open"] .algorithm-workspace-page {
          width:calc(100% - 20px) !important; max-width:none !important;
          margin-inline:10px !important; padding-bottom:24px !important;
        }
        body[data-expedition-pass="open"] .algorithm-workspace-page > .oa-pagehead { padding:52px 0 26px; }
        body[data-expedition-pass="open"] .algorithm-workspace-page > .oa-pagehead h1 { font-size:46px; }
        body[data-expedition-pass="open"] .algorithm-workspace-page > .oa-pagehead .ph-blurb { font-size:16px; }
        body[data-expedition-pass="open"] .algorithm-workspace-tabs { zoom:.75; }
        body[data-expedition-pass="open"] .algorithm-workspace-grid {
          grid-template-columns:minmax(0,400px) minmax(0,1fr) 330px !important;
          min-height:1115px !important;
          zoom:.75;
        }
        body[data-expedition-pass="open"] .algorithm-workspace-grid > aside { min-height:1115px !important; }
        body[data-expedition-pass="open"] .algorithm-workspace-root { min-height:878px !important; }

        @media (min-width:1400px) {
          body[data-expedition-pass="open"] .oa-main { margin-left:325px !important; }
        }

        .expedition-pass {
          position:fixed; inset:0 auto 0 0; z-index:90; width:325px; overflow-y:auto;
          --ep-top:124px;
          padding:var(--ep-top) 23px 54px; color:var(--ink); background:var(--paper);
          border-right:0.5px solid var(--hairline-strong); box-shadow:1px 0 4px rgba(26,25,22,.08);
        }
        .ep-close {
          position:absolute; top:calc(var(--ep-top) - 2px); right:20px; width:34px; height:34px; padding:0;
          border:0; background:transparent; color:var(--ink-2); cursor:pointer;
          font:300 33px/1 var(--font-body);
        }
        .ep-compass {
          display:block; width:30px; height:30px;
          color:var(--ink-2); fill:none; stroke:currentColor; stroke-width:1.15;
        }
        .expedition-pass h2 {
          margin:20px 0 0; font-family:var(--font-display); font-size:31px; font-weight:540;
          line-height:1.18; letter-spacing:-.025em;
        }
        .ep-ru { margin:0; font-family:var(--font-body); color:var(--muted); font-size:9.5px; line-height:1.55; }
        .ep-intro-ru { margin-top:10px; }
        .ep-route {
          position:relative; display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:8px; margin-top:72px;
        }
        .ep-route::before {
          content:""; position:absolute; z-index:0; left:35px; right:35px; top:31px;
          border-top:2px dashed var(--ink); opacity:.9;
        }
        .ep-route-step { appearance:none; position:relative; z-index:1; min-width:0; padding:0; border:0; background:transparent; color:inherit; text-align:left; cursor:pointer; }
        .ep-stamp {
          width:62px; height:62px; margin:0 auto; display:flex; flex-direction:column; align-items:center; justify-content:center;
          aspect-ratio:1 / 1;
          border:1.35px solid currentColor; border-radius:50%; background:var(--paper); font-family:var(--font-body);
          font-size:6.3px; line-height:1; font-weight:700; letter-spacing:.08em;
        }
        .ep-stamp svg {
          width:27px; height:27px; margin:2px 0; overflow:visible; fill:none; stroke:currentColor;
          stroke-width:1.35; stroke-linecap:round; stroke-linejoin:round;
          transition:transform .22s ease;
        }
        .ep-stamp svg > *, .ep-stamp svg g { transform-box:fill-box; transform-origin:center; }
        .ep-stamp-two { color:#4d8b72; }
        .ep-stamp-slide { color:#3d73a8; }
        .ep-stamp-search { color:#b78343; }
        .ep-stamp-graph { color:#7d5aa6; }
        .ep-route-step:hover .ep-stamp svg { transform:scale(1.06); }
        .ep-route-step:hover .ep-icon-left { animation:ep-two-left .65s ease both; }
        .ep-route-step:hover .ep-icon-right { animation:ep-two-right .65s ease both; }
        .ep-route-step:hover .ep-icon-wave { animation:ep-wave .75s ease both; }
        .ep-route-step:hover .ep-icon-window { animation:ep-window .75s ease both; }
        .ep-route-step:hover .ep-icon-lens { animation:ep-lens .65s ease both; }
        .ep-route-step:hover .ep-icon-handle { animation:ep-handle .65s ease both; }
        .ep-route-step:hover .ep-icon-edges { stroke-dasharray:36; animation:ep-draw .8s ease both; }
        .ep-route-step:hover .ep-icon-node-1 { animation:ep-node .75s ease 0s both; }
        .ep-route-step:hover .ep-icon-node-2 { animation:ep-node .75s ease .08s both; }
        .ep-route-step:hover .ep-icon-node-3 { animation:ep-node .75s ease .16s both; }
        .ep-route-step:hover .ep-icon-node-4 { animation:ep-node .75s ease .24s both; }
        @keyframes ep-two-left { 50% { transform:translateX(2px); } }
        @keyframes ep-two-right { 50% { transform:translateX(-2px); } }
        @keyframes ep-wave { 50% { transform:translateX(2px); } }
        @keyframes ep-window { 50% { transform:translateX(3px); } }
        @keyframes ep-lens { 50% { transform:scale(1.08); } }
        @keyframes ep-handle { 50% { transform:rotate(7deg); } }
        @keyframes ep-draw { from { stroke-dashoffset:36; } to { stroke-dashoffset:0; } }
        @keyframes ep-node { 50% { transform:scale(1.35); } }
        @media (prefers-reduced-motion:reduce) {
          .ep-stamp svg { transition:none; }
          .ep-route-step:hover .ep-stamp svg,
          .ep-route-step:hover .ep-stamp svg * { animation:none !important; transform:none; }
        }
        .ep-route-en {
          min-height:37px; margin:13px 0 0; font-family:var(--font-display); font-size:11.5px;
          font-weight:520; line-height:1.25; color:var(--ink);
        }
        .ep-route-ru { margin-top:5px; font-size:8.5px; line-height:1.45; }
        .ep-week {
          appearance:none; color:inherit; text-align:left; cursor:pointer; background:transparent;
          display:grid; grid-template-columns:54px 1fr; gap:14px; align-items:center; min-height:110px;
          width:272px; margin-top:63px; padding:16px 14px; border:0.5px solid var(--hairline-strong); border-radius:2px;
        }
        .ep-flag {
          width:48px; height:48px; display:grid; place-items:center; border:1px solid #4d8b72; border-radius:50%; color:#3d8b69;
        }
        .ep-flag svg { width:27px; height:27px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
        .ep-week h3 { margin:0; font-family:var(--font-display); font-size:15px; font-weight:620; line-height:1.2; }
        .ep-week div > p { margin:8px 0 0; font-size:12px; line-height:1.35; color:var(--ink-2); }
        .ep-week > .ep-ru { grid-column:1 / -1; margin-top:2px; font-size:9px; }
        .ep-benefits { width:272px; margin-top:63px; padding-top:27px; border-top:1px dashed var(--muted); }
        .ep-benefits > p:first-child { margin:0; font-family:var(--font-display); font-size:12.5px; line-height:1.9; color:var(--ink); }
        .ep-benefits .ep-ru { margin-top:9px; font-size:9.5px; line-height:1.55; }
        .ep-cta {
          width:272px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer;
          border-radius:2px; font-family:var(--font-display); font-weight:560;
        }
        .ep-cta span { font-size:15px; line-height:1.25; }
        .ep-cta small { margin-top:8px; font:400 9.5px/1.25 var(--font-body); }
        .ep-cta-primary { min-height:80px; margin-top:36px; border:0.5px solid var(--ink); background:var(--ink); color:var(--paper); }
        .ep-cta-primary[disabled] { cursor:not-allowed; opacity:.58; }
        .ep-cta-primary small { color:color-mix(in srgb,var(--paper) 76%,transparent); }
        .ep-cta-secondary { min-height:74px; margin-top:16px; border:0.5px solid var(--ink-2); background:transparent; color:var(--ink); }
        .ep-cta-secondary small { color:var(--muted); }
        .ep-support-note { width:272px; margin:8px 0 0; font-size:10px; line-height:1.45; color:var(--muted); text-align:center; }
        .ep-close:focus-visible, .ep-cta:focus-visible, .ep-route-step:focus-visible, .ep-week:focus-visible { outline:2px solid var(--accent); outline-offset:2px; }

        @media (min-width:1505px) {
          body[data-expedition-pass="open"] .algorithm-workspace-tabs,
          body[data-expedition-pass="open"] .algorithm-workspace-grid { zoom:1; }
          body[data-expedition-pass="open"] .algorithm-workspace-grid {
            grid-template-columns:minmax(0,420px) minmax(0,1fr) 300px !important;
            min-height:calc(100vh - 56px) !important;
          }
          body[data-expedition-pass="open"] .algorithm-workspace-grid > aside { min-height:calc(100vh - 56px) !important; }
          body[data-expedition-pass="open"] .algorithm-workspace-root { min-height:100vh !important; }
        }

        @media (min-width:720px) and (max-height:1050px) {
          .expedition-pass { --ep-top:72px; }
          .ep-route { margin-top:40px; }
          .ep-week { margin-top:28px; }
          .ep-benefits { margin-top:28px; padding-top:18px; }
          .ep-cta-primary { margin-top:18px; }
          .ep-cta-secondary { margin-top:14px; }
        }

        @media (max-width:719.98px) {
          body[data-expedition-pass="open"] .oa-main { margin-left:0 !important; }
          body[data-expedition-pass="open"] .algorithm-workspace-page {
            width:calc(100% - var(--s-6)) !important; max-width:1180px !important;
            margin-inline:auto !important; padding-bottom:var(--s-9) !important;
          }
          body[data-expedition-pass="open"] .algorithm-workspace-root { min-height:100vh !important; }
          body[data-expedition-pass="open"] .algorithm-workspace-tabs,
          body[data-expedition-pass="open"] .algorithm-workspace-grid { min-height:calc(100vh - 56px) !important; zoom:1; }
          body[data-expedition-pass="open"] .algorithm-workspace-grid > aside { min-height:calc(100vh - 56px) !important; }
          .expedition-pass { width:100%; max-width:325px; }
        }
      `}</style>
    </aside>
  );
}
