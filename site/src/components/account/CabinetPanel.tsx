// src/components/account/CabinetPanel.tsx
// The single Personal-Cabinet island — plain Preact composition, NO client:* here;
// account.astro mounts this once. Re-skin of docs/redesign/v2 "Personal Cabinet":
//   01 ACCOUNT     → IdentitySection  (auth flow reused verbatim from AccountPanel)
//   02 OVERVIEW    → OverviewGrid     (six real-data "where you stand" cards)
//   03 YOUR DATA   → DataSection  ┐
//   04 AI KEY      → ByokSection  ┘ side-by-side in .cab-grid (embeds KeyEntry verbatim)
//   05 PREFERENCES → PreferencesSection (theme/motion/depth/density/language setters)
// All data is real. No fabricated rating/sync-timestamp/providers.
import { type Locale } from "~/i18n";
import IdentitySection from "./IdentitySection";
import OverviewGrid from "./OverviewGrid";
import DataSection from "./DataSection";
import ByokSection from "./ByokSection";
import PreferencesSection from "./PreferencesSection";

const L = {
  en: {
    secId: "01 · ACCOUNT", idHead: "Identity", idNote: "Optional — local-first works without it",
    secOv: "02 · OVERVIEW", ovHead: "Where you stand", ovNote: "Jump into any surface",
    secData: "03 · YOUR DATA", dataHead: "Your data",
    secByok: "04 · AI KEY", byokHead: "Your AI key (BYOK)",
    secPref: "05 · PREFERENCES", prefHead: "Preferences", prefNote: "Saved locally",
  },
  ru: {
    secId: "01 · АККАУНТ", idHead: "Личность", idNote: "Опционально — local-first работает и без этого",
    secOv: "02 · ОБЗОР", ovHead: "Где ты сейчас", ovNote: "Переходи к любой поверхности",
    secData: "03 · ТВОИ ДАННЫЕ", dataHead: "Твои данные",
    secByok: "04 · AI-КЛЮЧ", byokHead: "Твой AI-ключ (BYOK)",
    secPref: "05 · НАСТРОЙКИ", prefHead: "Настройки", prefNote: "Сохраняется локально",
  },
} as const;

export default function CabinetPanel({ lang }: { lang: Locale }) {
  const l = L[lang];
  return (
    <div>
      {/* 01 · ACCOUNT — identity */}
      <section class="screen-section" aria-labelledby="id-h">
        <div class="sec-head">
          <span class="sec-index">{l.secId}</span>
          <h2 id="id-h">{l.idHead}</h2>
          <span class="sec-note">{l.idNote}</span>
        </div>
        <IdentitySection lang={lang} />
      </section>

      {/* 02 · OVERVIEW — where you stand */}
      <section class="screen-section" aria-labelledby="ov-h">
        <div class="sec-head">
          <span class="sec-index">{l.secOv}</span>
          <h2 id="ov-h">{l.ovHead}</h2>
          <span class="sec-note">{l.ovNote}</span>
        </div>
        <OverviewGrid lang={lang} />
      </section>

      {/* 03 · YOUR DATA + 04 · AI KEY — two columns */}
      <div class="cab-grid">
        <section class="screen-section cab-col" aria-labelledby="data-h">
          <div class="sec-head">
            <span class="sec-index">{l.secData}</span>
            <h2 id="data-h">{l.dataHead}</h2>
          </div>
          <DataSection lang={lang} />
        </section>

        <section class="screen-section cab-col" aria-labelledby="byok-h">
          <div class="sec-head">
            <span class="sec-index">{l.secByok}</span>
            <h2 id="byok-h">{l.byokHead}</h2>
          </div>
          <ByokSection lang={lang} />
        </section>
      </div>

      {/* 05 · PREFERENCES */}
      <section class="screen-section" aria-labelledby="pref-h">
        <div class="sec-head">
          <span class="sec-index">{l.secPref}</span>
          <h2 id="pref-h">{l.prefHead}</h2>
          <span class="sec-note">{l.prefNote}</span>
        </div>
        <PreferencesSection lang={lang} />
      </section>
    </div>
  );
}
