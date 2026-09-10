import { Button as ShadcnButton } from "~/components/ui/button";
import { Input as ShadcnInput } from "~/components/ui/input";
import { NativeSelect as ShadcnNativeSelect } from "~/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle } from "~/components/ui/sheet";
// src/components/path/PathConfigDrawer.tsx
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import { config, setKnob } from "~/scripts/path/path-io";
import type { Tier } from "~/scripts/path/types";
import OverridesEditor from "./OverridesEditor";
import StateIOPanel from "./StateIOPanel";

const TIERS: Tier[] = ["junior", "middle", "senior"];
const L = {
  en: { title: "Tune your path", focus: "Focus", depthFirst: "depth-first", breadthFirst: "breadth-first", pace: "Pace", steps: "Steps shown", srs: "Review frequency", depth: "Depth tier", advanced: "Advanced (signal weights)", threshold: "Known threshold", decay: "Decay floor", close: "Done" },
  ru: { title: "Настрой путь", focus: "Фокус", depthFirst: "вглубь", breadthFirst: "вширь", pace: "Темп", steps: "Шагов показывать", srs: "Частота повторений", depth: "Уровень глубины", advanced: "Продвинутое (веса сигналов)", threshold: "Порог «знаю»", decay: "Пол затухания", close: "Готово" },
} as const;

export default function PathConfigDrawer({ lang, onClose }: { lang: Locale; onClose: () => void }) {
  const t = L[lang];
  const cfg = config.value;
  const [adv, setAdv] = useState(false);
  const num = (e: Event) => Number((e.target as HTMLInputElement).value);

  return (
    <Sheet open onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent class="bg-white p-5 shadow-xl" aria-describedby={undefined}>
        <div class="flex items-center justify-between mb-4">
          <SheetTitle asChild><h2 class="text-xl font-bold">{t.title}</h2></SheetTitle>
          <ShadcnButton class="rounded border border-stone-300 px-3 py-1 text-sm" onClick={onClose}>{t.close}</ShadcnButton>
        </div>

        <label class="block text-sm mb-4">{t.focus}: {t.depthFirst} ↔ {t.breadthFirst}
          <ShadcnInput type="range" min={0} max={1} step={0.1} value={cfg.breadthVsDepth} class="mt-1 block w-full"
            onInput={(e) => setKnob({ breadthVsDepth: num(e) })} />
        </label>

        <label class="block text-sm mb-2">{t.steps}: {cfg.pace.stepsAhead}
          <ShadcnInput type="range" min={1} max={20} step={1} value={cfg.pace.stepsAhead} class="mt-1 block w-full"
            onInput={(e) => setKnob({ pace: { ...cfg.pace, stepsAhead: num(e) } })} />
        </label>
        <label class="block text-sm mb-4">{t.srs}: {cfg.pace.srsAggressiveness}
          <ShadcnInput type="range" min={0} max={1} step={0.1} value={cfg.pace.srsAggressiveness} class="mt-1 block w-full"
            onInput={(e) => setKnob({ pace: { ...cfg.pace, srsAggressiveness: num(e) } })} />
        </label>

        <label class="block text-sm mb-4">{t.depth}
          <ShadcnNativeSelect class="mt-1 block rounded border border-stone-300 px-2 py-1" value={typeof cfg.depthTier === "string" ? cfg.depthTier : "middle"}
            onChange={(e) => setKnob({ depthTier: (e.target as HTMLSelectElement).value as Tier })}>
            {TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
          </ShadcnNativeSelect>
        </label>

        <ShadcnButton class="text-sm text-stone-500 underline" onClick={() => setAdv((v) => !v)}>{t.advanced}</ShadcnButton>
        {adv && (
          <div class="mt-3 flex flex-col gap-2">
            <label class="block text-sm">{t.threshold}: {cfg.weights.masteryThreshold}
              <ShadcnInput type="range" min={0.1} max={0.95} step={0.05} value={cfg.weights.masteryThreshold} class="mt-1 block w-full"
                onInput={(e) => setKnob({ weights: { ...cfg.weights, masteryThreshold: num(e) } })} />
            </label>
            <label class="block text-sm">{t.decay}: {cfg.weights.decayFloor}
              <ShadcnInput type="range" min={0} max={0.5} step={0.05} value={cfg.weights.decayFloor} class="mt-1 block w-full"
                onInput={(e) => setKnob({ weights: { ...cfg.weights, decayFloor: num(e) } })} />
            </label>
          </div>
        )}
        <OverridesEditor lang={lang} />
        <StateIOPanel lang={lang} />
      </SheetContent>
    </Sheet>
  );
}
