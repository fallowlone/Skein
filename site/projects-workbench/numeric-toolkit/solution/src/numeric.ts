/**
 * Numeric Toolkit — reference solution
 *
 * matmul  : O(m·k·n) matrix multiply, no external deps
 * solve   : Gaussian elimination with partial pivoting; throws on singular
 * variance: Welford one-pass — immune to catastrophic cancellation
 */

export function matmul(A: number[][], B: number[][]): number[][] {
  const m = A.length;
  const k = A[0].length;
  if (B.length !== k) throw new Error(`matmul: inner dimensions ${k} ≠ ${B.length}`);
  const n = B[0].length;
  const C: number[][] = Array.from({ length: m }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let p = 0; p < k; p++) s += A[i][p] * B[p][j];
      C[i][j] = s;
    }
  }
  return C;
}

export function solve(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Build augmented matrix [A | b] — deep-copy so we don't mutate inputs
  const M: number[][] = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    // Partial pivoting: find row with largest absolute value in this column
    let maxRow = col;
    let maxVal = Math.abs(M[col][col]);
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(M[row][col]);
      if (v > maxVal) { maxVal = v; maxRow = row; }
    }
    if (maxVal < 1e-12) throw new Error("solve: singular or near-singular matrix");

    // Swap rows
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    // Eliminate below
    const pivot = M[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / pivot;
      for (let j = col; j <= n; j++) M[row][j] -= factor * M[col][j];
    }
  }

  // Back-substitution
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

/**
 * Population variance via Welford's online algorithm.
 * Accumulates the sum of squared deviations from the running mean,
 * avoiding catastrophic cancellation that plagues the naive E[X²] − E[X]² form.
 */
export function variance(xs: number[]): number {
  if (xs.length === 0) throw new Error("variance: empty array");
  if (xs.length === 1) return 0;
  let mean = 0;
  let M2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const delta = xs[i] - mean;
    mean += delta / (i + 1);
    M2 += delta * (xs[i] - mean);
  }
  return M2 / xs.length; // population variance (÷ n)
}
