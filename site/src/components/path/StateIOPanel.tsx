// src/components/path/StateIOPanel.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { exportState, importState } from "~/scripts/path/path-io";

const L = {
  en: { title: "Backup & restore", export: "Export progress", import: "Import progress", confirm: "Replace your local progress with this file?", ok: "Imported — your path is restored.", fail: "Import failed: " },
  ru: { title: "Резервная копия", export: "Экспорт прогресса", import: "Импорт прогресса", confirm: "Заменить локальный прогресс этим файлом?", ok: "Импортировано — путь восстановлен.", fail: "Ошибка импорта: " },
} as const;

export default function StateIOPanel({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const onFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!confirm(t.confirm)) { (e.target as HTMLInputElement).value = ""; return; }
    const text = await file.text();
    const r = importState(text);
    setMsg(r.ok ? { ok: true, text: t.ok } : { ok: false, text: t.fail + r.error });
    (e.target as HTMLInputElement).value = "";
  };

  return (
    <section class="mt-4 border-t border-stone-200 pt-3">
      <h3 class="font-semibold text-sm mb-2">{t.title}</h3>
      <div class="flex flex-wrap items-center gap-2">
        <button class="rounded border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100" onClick={() => exportState(Date.now())}>{t.export}</button>
        <label class="rounded border border-stone-300 px-3 py-1.5 text-xs hover:bg-stone-100 cursor-pointer">
          {t.import}
          <input type="file" accept="application/json,.json" class="hidden" onChange={onFile} />
        </label>
      </div>
      {msg && <p class={`mt-1 text-xs ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
    </section>
  );
}
