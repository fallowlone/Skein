export type EditOp<T> = { op: "keep" | "insert" | "delete"; value: T };

/**
 * Compute the longest common subsequence of two arrays.
 * Uses O(M*N) DP. An optional `eq` function handles non-primitive equality.
 */
export function lcs<T>(
  a: T[],
  b: T[],
  eq: (x: T, y: T) => boolean = (x, y) => x === y
): T[] {
  const M = a.length;
  const N = b.length;

  // dp[i][j] = length of LCS of a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: M + 1 }, () =>
    new Array(N + 1).fill(0)
  );

  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (eq(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack: prefer diagonal (match) > up (skip a[i]) > left (skip b[j])
  const result: T[] = [];
  let i = M;
  let j = N;
  while (i > 0 && j > 0) {
    if (eq(a[i - 1], b[j - 1])) {
      result.push(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result.reverse();
}

/**
 * Compute a minimal edit script from a to b.
 *
 * Returns an array of EditOp<T> where:
 *   - keep+insert ops in order reproduce b exactly
 *   - keep+delete ops in order reproduce a exactly
 *
 * Uses the LCS DP table backtrack (equivalent to Myers O(ND) in edit-script
 * semantics; swap core for the V-array search in the Myers milestone).
 */
export function diff<T>(
  a: T[],
  b: T[],
  eq: (x: T, y: T) => boolean = (x, y) => x === y
): EditOp<T>[] {
  const M = a.length;
  const N = b.length;

  // Build the DP table
  const dp: number[][] = Array.from({ length: M + 1 }, () =>
    new Array(N + 1).fill(0)
  );
  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (eq(a[i - 1], b[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack into edit script (build in reverse, then flip)
  const ops: EditOp<T>[] = [];
  let i = M;
  let j = N;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && eq(a[i - 1], b[j - 1])) {
      // Diagonal: match → keep
      ops.push({ op: "keep", value: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Move left: insert from b
      ops.push({ op: "insert", value: b[j - 1] });
      j--;
    } else {
      // Move up: delete from a
      ops.push({ op: "delete", value: a[i - 1] });
      i--;
    }
  }

  return ops.reverse();
}
