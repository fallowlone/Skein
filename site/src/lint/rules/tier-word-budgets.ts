type Tier = "junior" | "middle" | "senior";

const BUDGETS: Record<Tier, { min: number; max: number }> = {
  junior: { min: 200, max: 700 },
  middle: { min: 2500, max: 3700 },
  senior: { min: 2500, max: 4000 },
};

const PANEL_RE = /<div data-tier-panel="(junior|middle|senior)"[^>]*>([\s\S]*?)<\/div><!--\/tier-panel-->/g;

function countWords(html: string): number {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) return 0;
  return stripped.split(" ").length;
}

export function checkTierWordBudgets(html: string, file: string): string[] {
  const warnings: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = PANEL_RE.exec(html))) {
    const tier = m[1] as Tier;
    const inner = m[2];
    const count = countWords(inner);
    const { min, max } = BUDGETS[tier];
    if (count < min) {
      warnings.push(`${file}: ${tier} word count ${count} is below ${min}`);
    } else if (count > max) {
      warnings.push(`${file}: ${tier} word count ${count} is above ${max}`);
    }
  }
  return warnings;
}
