// site/src/scripts/capstone-state.ts
// Per-milestone capstone completion, persisted to localStorage. Mirrors
// practice-state.ts (own key per slug, try/catch-swallowed I/O). The store is the
// source of truth for the project-path UI; UserState.capstones is the sync-forward
// mirror. See docs/superpowers/plans/2026-06-05-guided-capstone-path.md.

const keyFor = (slug: string) => `skein.capstone.${slug}`;

export function readCapstone(slug: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(keyFor(slug));
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function setMilestoneDone(slug: string, milestoneId: string, done: boolean): void {
  try {
    const cur = readCapstone(slug);
    cur[milestoneId] = done;
    localStorage.setItem(keyFor(slug), JSON.stringify(cur));
  } catch {
    /* private browsing, storage full — non-fatal */
  }
}

export function percentDone(slug: string, total: number): number {
  if (total <= 0) return 0;
  const done = Object.values(readCapstone(slug)).filter(Boolean).length;
  return Math.round((done / total) * 100);
}
