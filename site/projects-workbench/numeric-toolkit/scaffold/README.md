# Numeric Toolkit — starter

Implement three routines in `src/numeric.ts` so the acceptance suite passes:

    bun test

**Contract:**
- `matmul(A, B)` — matrix multiplication (throws on dimension mismatch)
- `solve(A, b)` — Gaussian elimination with **partial pivoting**; throws on singular
- `variance(xs)` — numerically stable population variance (Welford or two-pass)

The suite checks: a hand-verified product, a 3×3 system with an integer solution,
a zero-first-pivot case that breaks naive elimination, catastrophic cancellation in
naive variance, and a singular-matrix throw.

When it is green, read the project rubric and push toward the senior bar.

---

Product milestones — see the project page for the full 5–5-step product brief (mechanism → tradeoff → failure mode → numbers):

1. **Vectors and matrices as data** (`vectors-and-matrices`)
2. **Solve Ax = b by elimination** (`gaussian-elimination`)
3. **Make the solver survive bad rows** (`pivoting-and-failure`)
4. **Describe a column of numbers** (`descriptive-statistics`)
5. **Test against known truth** (`test-against-truth`)

When the suite is green, read the project's `rubric` and `reference` on the site and push to the senior bar — the README checks the core, the project page checks the product.

