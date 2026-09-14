import { Button as ShadcnButton } from "~/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "~/components/ui/select";
import { Field } from "~/components/ui/field";
import { Slider } from "~/components/ui/slider";
import { Icon } from "~/components/ui/icon";
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

  return (
    <Sheet open onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <SheetContent class="bg-paper p-5 shadow-soft-md animate-reveal-up" aria-describedby={undefined} side="right">
        <div class="flex items-center justify-between mb-4">
          <SheetTitle asChild><h2 class="font-display text-xl font-semibold text-ink">{t.title}</h2></SheetTitle>
          <ShadcnButton class="rounded border border-stone-300 px-3 py-1 text-sm mk-press" onClick={onClose}>
            <Icon name="x" size={14} />
            {t.close}
          </ShadcnButton>
        </div>

        <Field label={`${t.focus}: ${t.depthFirst} ↔ ${t.breadthFirst}`} htmlFor="path-focus">
          <Slider id="path-focus" min={0} max={1} step={0.1} value={[cfg.breadthVsDepth]}
            onValueChange={(v: number[]) => setKnob({ breadthVsDepth: v[0] ?? cfg.breadthVsDepth })} />
        </Field>

        <Field label={`${t.steps}: ${cfg.pace.stepsAhead}`} htmlFor="path-steps">
          <Slider id="path-steps" min={1} max={20} step={1} value={[cfg.pace.stepsAhead]}
            onValueChange={(v: number[]) => setKnob({ pace: { ...cfg.pace, stepsAhead: Math.round(v[0] ?? cfg.pace.stepsAhead) } })} />
        </Field>
        <Field label={`${t.srs}: ${cfg.pace.srsAggressiveness}`} htmlFor="path-srs">
          <Slider id="path-srs" min={0} max={1} step={0.1} value={[cfg.pace.srsAggressiveness]}
            onValueChange={(v: number[]) => setKnob({ pace: { ...cfg.pace, srsAggressiveness: v[0] ?? cfg.pace.srsAggressiveness } })} />
        </Field>

        <Field label={t.depth} htmlFor="path-depth">
          <Select value={typeof cfg.depthTier === "string" ? cfg.depthTier : "middle"} onValueChange={(v: string) => setKnob({ depthTier: v as Tier })}>
            <SelectTrigger id="path-depth" class="mt-1 rounded border border-stone-300 px-2 py-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>

        <ShadcnButton class="text-sm text-stone-500 underline mk-press" onClick={() => setAdv((v) => !v)} aria-expanded={adv}>
          <Icon name="chevron-down" size={14} className={adv ? "rotate-180 transition-transform duration-[var(--dur-2)]" : "transition-transform duration-[var(--dur-2)]"} />
          {t.advanced}
        </ShadcnButton>
        {adv && (
          <div class="mt-3 flex flex-col gap-2">
            <Field label={`${t.threshold}: ${cfg.weights.masteryThreshold}`} htmlFor="path-threshold">
              <Slider id="path-threshold" min={0.1} max={0.95} step={0.05} value={[cfg.weights.masteryThreshold]}
                onValueChange={(v: number[]) => setKnob({ weights: { ...cfg.weights, masteryThreshold: v[0] ?? cfg.weights.masteryThreshold } })} />
            </Field>
            <Field label={`${t.decay}: ${cfg.weights.decayFloor}`} htmlFor="path-decay">
              <Slider id="path-decay" min={0} max={0.5} step={0.05} value={[cfg.weights.decayFloor]}
                onValueChange={(v: number[]) => setKnob({ weights: { ...cfg.weights, decayFloor: v[0] ?? cfg.weights.decayFloor } })} />
            </Field>
          </div>
        )}
        <OverridesEditor lang={lang} />
        <StateIOPanel lang={lang} />
      </SheetContent>
    </Sheet>
  );
}
