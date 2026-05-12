export function checkHydrationBudget(html: string, file: string): string[] {
  const matches = html.match(/<astro-island\b/g);
  const count = matches?.length ?? 0;
  if (count > 5) return [`${file}: ${count} hydration islands (max 5)`];
  return [];
}
