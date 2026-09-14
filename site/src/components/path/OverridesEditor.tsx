import { Input as ShadcnInput } from "~/components/ui/input";
import { Button as ShadcnButton } from "~/components/ui/button";
import { Field } from "~/components/ui/field";
import { Icon } from "~/components/ui/icon";
// src/components/path/OverridesEditor.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { overrides, addOverrideEdge, removeOverrideEntry, clearOverrides, conceptExists } from "~/scripts/path/path-io";

const L = {
  en: { title: "Fix prerequisites", concept: "concept id", requires: "prereq id", add: "Add prereq", remove: "Remove prereq", reset: "Reset all", none: "No local overrides.", unknown: "Unknown concept id", removeE: "remove", addE: "add", del: "Delete" },
  ru: { title: "Исправить пререквизиты", concept: "id концепта", requires: "id пререквизита", add: "Добавить", remove: "Убрать", reset: "Сбросить все", none: "Нет локальных правок.", unknown: "Неизвестный id концепта", removeE: "убрать", addE: "добавить", del: "Удалить" },
} as const;

export default function OverridesEditor({ lang }: { lang: Locale }) {
  const t = L[lang];
  const ov = overrides.value;
  const [c, setC] = useState("");
  const [r, setR] = useState("");
  const [err, setErr] = useState("");

  const submit = (kind: "add" | "remove") => {
    if (!conceptExists(c) || !conceptExists(r)) { setErr(t.unknown); return; }
    addOverrideEdge(c.trim(), r.trim(), kind); setC(""); setR(""); setErr("");
  };
  const entries = [
    ...(ov.addEdges ?? []).map((e) => ({ ...e, kind: "add" as const })),
    ...(ov.removeEdges ?? []).map((e) => ({ ...e, kind: "remove" as const })),
  ];

  return (
    <section class="mt-4 border-t border-stone-200 pt-3">
      <Field label={t.title} htmlFor="ov-concept" error={err || undefined}>
        <div class="flex flex-wrap items-center gap-2">
          <ShadcnInput id="ov-concept" class="w-32 rounded border border-stone-300 px-2 py-1 text-xs" placeholder={t.concept} value={c}
            aria-label={t.concept} aria-invalid={Boolean(err)} aria-describedby={err ? "ov-concept-error" : undefined}
            clearable state={err ? "error" : "default"} onInput={(e) => setC((e.target as HTMLInputElement).value)} />
          <ShadcnInput id="ov-requires" class="w-32 rounded border border-stone-300 px-2 py-1 text-xs" placeholder={t.requires} value={r}
            aria-label={t.requires} aria-invalid={Boolean(err)} aria-describedby={err ? "ov-concept-error" : undefined}
            clearable state={err ? "error" : "default"} onInput={(e) => setR((e.target as HTMLInputElement).value)} />
          <ShadcnButton class="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 mk-press" onClick={() => submit("add")}>
            <Icon name="plus" size={12} />
            {t.add}
          </ShadcnButton>
          <ShadcnButton class="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 mk-press" onClick={() => submit("remove")}>
            <Icon name="minus" size={12} />
            {t.remove}
          </ShadcnButton>
        </div>
      </Field>
      <ul class="mt-2 flex flex-col gap-1 text-xs">
        {entries.length === 0 && <li class="text-stone-400">{t.none}</li>}
        {entries.map((e) => (
          <li key={`${e.kind}-${e.concept}-${e.requires}`} class="flex items-center gap-2">
            <span class="text-stone-500">{e.kind === "add" ? t.addE : t.removeE}</span>
            <code>{e.concept} → {e.requires}</code>
            <ShadcnButton class="ml-auto text-rose-500 mk-press" onClick={() => removeOverrideEntry(e.kind, e.concept, e.requires)} aria-label={t.del}>
              <Icon name="x" size={12} />
            </ShadcnButton>
          </li>
        ))}
      </ul>
      {entries.length > 0 && <ShadcnButton class="mt-2 text-xs text-stone-500 underline" onClick={() => clearOverrides()}>{t.reset}</ShadcnButton>}
    </section>
  );
}
