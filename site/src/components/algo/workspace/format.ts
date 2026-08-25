export function formatClock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(Math.max(0, totalSeconds) % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
