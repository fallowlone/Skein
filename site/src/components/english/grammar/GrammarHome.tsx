// src/components/english/grammar/GrammarHome.tsx
// Parent tab shell: Plan (default) | Browse. One hydrated island; GrammarAtlas
// renders as a non-hydrated child so the grammar page stays within the island cap.
import { useState } from "preact/hooks";
import type { Locale } from "~/i18n";
import type { GrammarFamily } from "~/english/grammar-types";
import type { PlanTopic } from "~/english/grammar-plan";
import type { GrammarCoverage } from "~/english/grammar-coverage";
import GrammarPlanner from "./GrammarPlanner";
import GrammarAtlas from "./GrammarAtlas";
import { gt } from "./strings";

export type HomeTopic = PlanTopic & { family: GrammarFamily };
type Props = { lang: Locale; topics: HomeTopic[]; coverage: GrammarCoverage };
type Tab = "plan" | "browse";

export default function GrammarHome({ lang, topics, coverage }: Props) {
  const [tab, setTab] = useState<Tab>("plan");
  return (
    <div>
      <div class="ghome-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "plan"} class={"btn " + (tab === "plan" ? "" : "ghost")} onClick={() => setTab("plan")}>{gt("plan_tab", lang)}</button>
        <button type="button" role="tab" aria-selected={tab === "browse"} class={"btn " + (tab === "browse" ? "" : "ghost")} onClick={() => setTab("browse")}>{gt("browse_tab", lang)}</button>
      </div>
      {tab === "plan"
        ? <GrammarPlanner lang={lang} topics={topics} coverage={coverage} />
        : <GrammarAtlas lang={lang} topics={topics} />}
    </div>
  );
}
