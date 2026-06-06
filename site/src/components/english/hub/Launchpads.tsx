// Delegated launchpads — Speaking + Writing. These hand a structured task to the learner's own AI
// (BYOK). The persona/task/rubric copy is from the v2 mockup (RU authored to match). The BYOK status
// chip reflects the real keystore via hasKey(); with no key it points at /writing where KeyEntry
// (with the verbatim security disclosure) lives. Plain Preact inside HubLanding.
import { useEffect, useState } from "preact/hooks";
import { hasKey } from "~/english/byok";
import { type Locale } from "~/i18n";

export default function Launchpads({ lang }: { lang: Locale }) {
  const [keyOn, setKeyOn] = useState(false);
  useEffect(() => {
    let alive = true;
    hasKey().then((v) => { if (alive) setKeyOn(v); });
    return () => { alive = false; };
  }, []);

  const L =
    lang === "en"
      ? {
          index: "05",
          h: "Routed to your AI",
          tag: "Delegate · powered by your own key (BYOK)",
          launchpad: "Launchpad",
          spKicker: "Speaking",
          spTitle: "Say it out loud",
          spCoach: "Coach — “The Skeptical Reviewer”",
          spRole: "probes assumptions, asks for precision",
          tbLabel: "Structured task we hand off",
          spTask: "Explain a concept aloud in 90 seconds, then field three follow-up questions about failure modes.",
          spR1: "fluency", spR2: "technical accuracy", spR3: "hedging language",
          wrKicker: "Writing — correction",
          wrTitle: "Get it marked up",
          wrCoach: "Coach — “The Precise Editor”",
          wrRole: "marks register, articles, hedging",
          wrTask: "Rewrite an incident postmortem for an exec audience. The coach flags article errors, register slips, and weak verbs — with reasons.",
          wrR1: "articles a/the", wrR2: "register", wrR3: "concision",
          keyOn: "your AI · key connected",
          keyOff: "your AI · add your key",
          open: "Open in your AI",
        }
      : {
          index: "05",
          h: "Передано твоему ИИ",
          tag: "Поручить · работает на твоём ключе (BYOK)",
          launchpad: "Запуск",
          spKicker: "Речь",
          spTitle: "Скажи вслух",
          spCoach: "Коуч — «Придирчивый ревьюер»",
          spRole: "проверяет допущения, требует точности",
          tbLabel: "Структурированная задача, которую мы передаём",
          spTask: "Объясни концепцию вслух за 90 секунд, затем ответь на три уточняющих вопроса о режимах отказа.",
          spR1: "беглость", spR2: "техническая точность", spR3: "язык хеджирования",
          wrKicker: "Письмо — правка",
          wrTitle: "Получи разметку",
          wrCoach: "Коуч — «Точный редактор»",
          wrRole: "отмечает регистр, артикли, хеджирование",
          wrTask: "Перепиши постмортем инцидента для руководства. Коуч отметит ошибки в артиклях, сбои регистра и слабые глаголы — с пояснениями.",
          wrR1: "артикли a/the", wrR2: "регистр", wrR3: "лаконичность",
          keyOn: "твой ИИ · ключ подключён",
          keyOff: "твой ИИ · добавь ключ",
          open: "Открыть в твоём ИИ",
        };

  const byokChip = (
    <span class="byok">
      {keyOn ? <span class="key"></span> : null}
      {keyOn ? L.keyOn : L.keyOff}
    </span>
  );

  return (
    <section class="hub-section" aria-labelledby="del-h">
      <div class="sec-head">
        <span class="sec-index">{L.index}</span>
        <h2 id="del-h">{L.h}</h2>
        <span class="mode-tag is-delegate"><span class="glyph">◆</span> {L.tag}</span>
      </div>

      <div class="row-2">
        {/* Speaking */}
        <div class="launchpad">
          <div class="lp-head">
            <div>
              <div class="kicker" style="margin-bottom:6px">{L.spKicker}</div>
              <div class="lp-title">{L.spTitle}</div>
            </div>
            <span class="chip-mode is-delegate"><span class="dot"></span>{L.launchpad}</span>
          </div>
          <div class="persona">
            <span class="pa-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M12 3a4 4 0 014 4v4a4 4 0 01-8 0V7a4 4 0 014-4z" /><path d="M5 11a7 7 0 0014 0M12 18v3" />
              </svg>
            </span>
            <div>
              <div class="pa-name">{L.spCoach}</div>
              <div class="pa-role">{L.spRole}</div>
            </div>
          </div>
          <div class="task-brief">
            <span class="tb-label">{L.tbLabel}</span>
            <span class="tb-text">“{L.spTask}”</span>
            <div class="tb-rubric"><span>{L.spR1}</span><span>{L.spR2}</span><span>{L.spR3}</span></div>
          </div>
          <div class="lp-foot">
            {byokChip}
            <a class="btn btn-launch btn-sm" href={`/${lang}/english/speaking`}>
              <span>{L.open}</span><span class="arrow">→</span>
            </a>
          </div>
        </div>

        {/* Writing */}
        <div class="launchpad">
          <div class="lp-head">
            <div>
              <div class="kicker" style="margin-bottom:6px">{L.wrKicker}</div>
              <div class="lp-title">{L.wrTitle}</div>
            </div>
            <span class="chip-mode is-delegate"><span class="dot"></span>{L.launchpad}</span>
          </div>
          <div class="persona">
            <span class="pa-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 20h4l10-10a2.8 2.8 0 00-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" />
              </svg>
            </span>
            <div>
              <div class="pa-name">{L.wrCoach}</div>
              <div class="pa-role">{L.wrRole}</div>
            </div>
          </div>
          <div class="task-brief">
            <span class="tb-label">{L.tbLabel}</span>
            <span class="tb-text">“{L.wrTask}”</span>
            <div class="tb-rubric"><span>{L.wrR1}</span><span>{L.wrR2}</span><span>{L.wrR3}</span></div>
          </div>
          <div class="lp-foot">
            {byokChip}
            <a class="btn btn-launch btn-sm" href={`/${lang}/english/writing`}>
              <span>{L.open}</span><span class="arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
