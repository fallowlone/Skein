import { useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { userState, setTier } from "~/scripts/user-state";
import { t, type Locale } from "~/i18n";
import type { Tier } from "~/types";

type Props = {
  id: string;
  lang: Locale;
  tiers: {
    junior?: ComponentChildren;
    middle: ComponentChildren;
    senior?: ComponentChildren;
  };
};

const TIER_ORDER: Tier[] = ["junior", "middle", "senior"];

export default function TierAccordion({ id, lang, tiers }: Props) {
  const initial: Tier = tiers[userState.value.tier] ? userState.value.tier : "middle";
  const [open, setOpen] = useState<Tier>(initial);

  return (
    <section id={id} class="my-8 rounded-2xl border border-gray-200 overflow-hidden">
      <header class="flex bg-gray-50 border-b border-gray-200">
        {TIER_ORDER.map((tier) => {
          if (!tiers[tier]) return null;
          const active = open === tier;
          return (
            <button
              type="button"
              onClick={() => {
                setOpen(tier);
                setTier(tier, true);
              }}
              class={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-white text-bbg-ink border-b-2 border-bbg-teal"
                  : "text-bbg-muted hover:text-bbg-ink"
              }`}
            >
              {t(`tier.${tier}`, lang)}
            </button>
          );
        })}
      </header>
      <div class="px-6 py-6">{tiers[open]}</div>
    </section>
  );
}
