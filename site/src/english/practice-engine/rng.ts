/** Mulberry32 seedable PRNG. Deterministic given the same seed. */
export type Rng = () => number;

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a uniformly-random integer in [0, length). */
export function pickIndex(length: number, rng: Rng): number {
  if (length <= 0) throw new Error("pickIndex: length must be > 0");
  return Math.floor(rng() * length);
}

/** Fisher-Yates in-place shuffle using the supplied RNG. */
export function shuffleInPlace<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
