// src/components/path/PathCard.tsx
import type { Locale } from "~/i18n";
import type { PathStep } from "~/scripts/path/types";
import { content } from "~/scripts/path/path-io";

const L = {
  en: { unlocks: "Unlocks", iKnow: "I know this", skip: "Skip", pin: "Pin", pinned: "Pinned", up: "↑", down: "↓", min: "min", quick: "quick check", learn: "learn", review: "review", check: "check" },
  ru: { unlocks: "Открывает", iKnow: "Уже знаю", skip: "Пропустить", pin: "Закрепить", pinned: "Закреплено", up: "↑", down: "↓", min: "мин", quick: "быстрая проверка", learn: "изучить", review: "повторить", check: "проверка" },
} as const;

type Props = {
  lang: Locale; step: PathStep; pinned: boolean; hasQuickCheck: boolean;
  onKnow: () => void; onSkip: () => void; onPin: () => void; onMove: (d: "up" | "down") => void;
};

export default function PathCard({ lang, step, pinned, hasQuickCheck, onKnow, onSkip, onPin, onMove }: Props) {
  const t = L[lang];
  const title = content.unitTitleById.get(step.unit)?.[lang] ?? step.unit;
  const concepts = step.unlocks.map((id) => content.conceptById.get(id)?.label[lang] ?? id);
  return (
    <li class="rounded-lg border border-stone-300 bg-white/70 p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-semibold text-stone-900">{title}</h3>
        <span class="text-xs uppercase tracking-wide text-stone-500">{t[step.kind]} · {step.estMin} {t.min}</span>
      </div>
      {concepts.length > 0 && (
        <p class="text-sm text-stone-600"><span class="text-stone-400">{t.unlocks}: </span>{concepts.slice(0, 6).join(", ")}{concepts.length > 6 ? "…" : ""}</p>
      )}
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={onKnow}>{t.iKnow}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={onSkip}>{t.skip}</button>
        <button class={`rounded border px-2 py-1 ${pinned ? "border-amber-500 bg-amber-50" : "border-stone-300 hover:bg-stone-100"}`} onClick={onPin}>{pinned ? t.pinned : t.pin}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={() => onMove("up")} aria-label="up">{t.up}</button>
        <button class="rounded border border-stone-300 px-2 py-1 hover:bg-stone-100" onClick={() => onMove("down")} aria-label="down">{t.down}</button>
        {hasQuickCheck && <span class="ml-auto rounded bg-emerald-50 px-2 py-1 text-emerald-700">✓ {t.quick}</span>}
      </div>
    </li>
  );
}
