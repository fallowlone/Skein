type Tier = "junior" | "middle" | "senior";

const TARGETS: Record<Tier, number> = {
  junior: 5,
  middle: 8,
  senior: 7,
};

const EXERCISE_COMPONENTS = new Set([
  "Quiz",
  "FadedExample",
  "RetrievalDrawer",
  "TraceScenario",
  "DebugLog",
  "TradeoffMatrix",
  "DragOrder",
  "MetaphorComplete",
  "RFCQuiz",
  "DesignPrompt",
  "AnimationStep",
  "NumberDrill",
  "Sandbox",
  "RequestBudgetSandbox",
]);

const PANEL_RE = /<div data-tier-panel="(junior|middle|senior)"[^>]*>([\s\S]*?)<\/div>/g;
const ISLAND_RE = /<astro-island[^>]*component-export="([^"]+)"/g;

function countExercises(panelHtml: string): number {
  let n = 0;
  let m: RegExpExecArray | null;
  while ((m = ISLAND_RE.exec(panelHtml))) {
    if (EXERCISE_COMPONENTS.has(m[1])) n++;
  }
  ISLAND_RE.lastIndex = 0;
  return n;
}

export function checkExerciseCounts(html: string, file: string): string[] {
  const warnings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PANEL_RE.exec(html))) {
    const tier = m[1] as Tier;
    const inner = m[2];
    const count = countExercises(inner);
    const target = TARGETS[tier];
    if (count < target) {
      warnings.push(`${file}: ${tier} has ${count} exercise component(s), target ${target}`);
    }
  }
  PANEL_RE.lastIndex = 0;
  return warnings;
}
