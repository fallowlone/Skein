export type TrackLike = { slug: string; order: number };

export function nextTrackByOrder<T extends TrackLike>(tracks: readonly T[], currentOrder: number): T | null {
  return tracks.find((t) => t.order === currentOrder + 1) ?? null;
}
