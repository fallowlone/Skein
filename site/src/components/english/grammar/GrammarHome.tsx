import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
      <Tabs value={tab} onValueChange={(value: Tab) => setTab(value)}>
        <TabsList class="ghome-tabs">
          <TabsTrigger value="plan" class={"btn " + (tab === "plan" ? "" : "ghost")}>{gt("plan_tab", lang)}</TabsTrigger>
          <TabsTrigger value="browse" class={"btn " + (tab === "browse" ? "" : "ghost")}>{gt("browse_tab", lang)}</TabsTrigger>
        </TabsList>
      </Tabs>
      {tab === "plan"
        ? <GrammarPlanner lang={lang} topics={topics} coverage={coverage} />
        : <GrammarAtlas lang={lang} topics={topics} />}
    </div>
  );
}
