/** Names a `sandbox` task may reference via `parametric.component`.
 *  Names only — no Preact imports — so the linter can import this safely.
 *  PracticeSection builds the lazy import map keyed by these names. */
export const PARAMETRIC_COMPONENT_NAMES = ["DBLeverSandbox", "RequestBudgetSandbox"] as const;
export type ParametricComponentName = (typeof PARAMETRIC_COMPONENT_NAMES)[number];
