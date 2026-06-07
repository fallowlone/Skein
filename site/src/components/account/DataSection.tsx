// src/components/account/DataSection.tsx
// 03 · YOUR DATA — export / import / reset, wired to the real StateIO + user-state APIs.
//   export  → exportState(Date.now())   (JSON blob download; the only Date.now() here)
//   import  → file → importState(text)   ({ok}|{ok:false,error}); error shown inline
//   reset   → confirm() → resetAll()     (clears the local user-state blob)
// Honest scope: the bundle covers the path graph + progression + settings (userState).
// It does NOT include the separate English-layer state — we say so rather than claim "everything".
import { useState } from "preact/hooks";
import { type Locale } from "~/i18n";
import { exportState, importState, resetPath } from "~/scripts/path/path-io";
import { resetAll } from "~/scripts/user-state";

const L = {
  en: {
    exportName: "Export progress",
    exportDesc: "Download your path, progression, and settings as a JSON file — cross-device by file, no cloud needed.",
    exportCta: "Export .json",
    importName: "Import progress",
    importDesc: "Load a previously exported file. Replaces your local progress.",
    importCta: "Import…",
    importConfirm: "Replace your local progress with this file?",
    importOk: "Imported — your progress is restored.",
    importFail: "Import failed: ",
    resetName: "Reset progress",
    resetDesc: "Erase your local path, progression, and settings. This cannot be undone.",
    resetCta: "Reset…",
    resetConfirm: "Reset all local progress? This cannot be undone.",
    resetDone: "Local progress reset.",
    scope: "Covers your path, progression, and preferences. Your English-layer progress is stored separately and is not part of this file.",
  },
  ru: {
    exportName: "Экспорт прогресса",
    exportDesc: "Скачай свой путь, прогрессию и настройки одним JSON-файлом — перенос между устройствами файлом, без облака.",
    exportCta: "Экспорт .json",
    importName: "Импорт прогресса",
    importDesc: "Загрузи ранее экспортированный файл. Заменяет локальный прогресс.",
    importCta: "Импорт…",
    importConfirm: "Заменить локальный прогресс этим файлом?",
    importOk: "Импортировано — прогресс восстановлен.",
    importFail: "Ошибка импорта: ",
    resetName: "Сбросить прогресс",
    resetDesc: "Стереть локальный путь, прогрессию и настройки. Отменить нельзя.",
    resetCta: "Сбросить…",
    resetConfirm: "Сбросить весь локальный прогресс? Отменить нельзя.",
    resetDone: "Локальный прогресс сброшен.",
    scope: "Включает твой путь, прогрессию и настройки. Прогресс English-слоя хранится отдельно и в этот файл не входит.",
  },
} as const;

export default function DataSection({ lang }: { lang: Locale }) {
  const l = L[lang];
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!confirm(l.importConfirm)) { input.value = ""; return; }
    try {
      const text = await file.text();
      const r = importState(text);
      setMsg(r.ok ? { ok: true, text: l.importOk } : { ok: false, text: l.importFail + r.error });
    } catch (err) {
      setMsg({ ok: false, text: l.importFail + String(err) }); // unreadable file → surface it, don't swallow
    }
    input.value = "";
  };

  function onReset() {
    if (!confirm(l.resetConfirm)) return;
    resetAll();   // user-state: progression / pretest / tier / motion
    resetPath();  // path-io: knowledge / config / overrides — otherwise the reset is partial
    setMsg({ ok: true, text: l.resetDone });
  }

  return (
    <div class="panel">
      <div class="set-list">
        <div class="set-row">
          <div class="set-info">
            <span class="set-name">{l.exportName}</span>
            <span class="set-desc">{l.exportDesc}</span>
          </div>
          <div class="set-control">
            <button type="button" class="btn btn-quiet btn-sm" onClick={() => exportState(Date.now())}>{l.exportCta}</button>
          </div>
        </div>

        <div class="set-row">
          <div class="set-info">
            <span class="set-name">{l.importName}</span>
            <span class="set-desc">{l.importDesc}</span>
          </div>
          <div class="set-control">
            <label class="btn btn-quiet btn-sm cab-file">
              {l.importCta}
              <input type="file" accept="application/json,.json" class="sr-file" aria-label={l.importName} onChange={onFile} />
            </label>
          </div>
        </div>

        <div class="set-row">
          <div class="set-info">
            <span class="set-name">{l.resetName}</span>
            <span class="set-desc">{l.resetDesc}</span>
          </div>
          <div class="set-control">
            <button type="button" class="btn btn-danger btn-sm" onClick={onReset}>{l.resetCta}</button>
          </div>
        </div>
      </div>

      {msg && <p class={`cab-msg ${msg.ok ? "ok" : "err"}`}>{msg.text}</p>}
      <p class="cite cab-scope">{l.scope}</p>
    </div>
  );
}
