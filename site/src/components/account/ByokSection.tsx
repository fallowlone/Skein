// src/components/account/ByokSection.tsx
// 04 · AI KEY (BYOK) — embeds the EXISTING KeyEntry component unchanged.
// SECURITY: the security disclosure lives inside KeyEntry.tsx and is rendered there
// verbatim — it is NOT re-typed, paraphrased, moved, or weakened here. We add no extra
// providers (the engine is Anthropic-only). This file only wraps KeyEntry in a cabinet
// .panel so it sits in the editorial grid; KeyEntry owns every word of the key UI.
import { type Locale } from "~/i18n";
import KeyEntry from "~/components/english/KeyEntry";

const L = {
  en: { intro: "Optional. Bring your own Anthropic API key to power AI grading for the English Speaking & Writing tasks. Without a key, those tasks fall back to self-assessment." },
  ru: { intro: "Опционально. Подключи свой Anthropic API-ключ для AI-оценки заданий на устную и письменную речь в English. Без ключа эти задания работают в режиме самопроверки." },
} as const;

export default function ByokSection({ lang }: { lang: Locale }) {
  const l = L[lang];
  return (
    <div class="panel byok-panel">
      <p class="byok-intro">{l.intro}</p>
      {/* Embedded, unchanged: its security disclosure is the single source of truth. */}
      <KeyEntry lang={lang} />
    </div>
  );
}
