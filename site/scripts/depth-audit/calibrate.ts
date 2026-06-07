export type Label = "good" | "thin";
export interface LabeledScore { unitKey: string; label: Label; overall: number; }
export interface Calibration {
  bar: number;
  f1: number;
  precision: number;
  recall: number;
  misclassified: { unitKey: string; label: Label; overall: number; predicted: Label }[];
}

function f1At(rows: LabeledScore[], bar: number) {
  let tp = 0, fp = 0, fn = 0;
  for (const r of rows) {
    const predicted: Label = r.overall >= bar ? "good" : "thin";
    if (r.label === "good" && predicted === "good") tp++;
    else if (r.label === "thin" && predicted === "good") fp++;
    else if (r.label === "good" && predicted === "thin") fn++;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { f1, precision, recall };
}

export function calibrateBar(rows: LabeledScore[]): Calibration {
  if (rows.length === 0) throw new Error("calibrateBar: empty labeled set");
  if (!rows.some((r) => r.label === "good") || !rows.some((r) => r.label === "thin"))
    throw new Error("calibrateBar: labeled set must contain both 'good' and 'thin' examples");
  const lo = Math.min(...rows.map((r) => r.overall));
  const hi = Math.max(...rows.map((r) => r.overall));
  let best = { bar: (lo + hi) / 2, f1: -1, precision: 0, recall: 0 };
  for (let bar = lo; bar <= hi + 1e-9; bar += 0.05) {
    const m = f1At(rows, bar);
    if (m.f1 > best.f1) best = { bar: Number(bar.toFixed(2)), ...m };
  }
  const misclassified = rows
    .map((r) => ({ ...r, predicted: (r.overall >= best.bar ? "good" : "thin") as Label }))
    .filter((r) => r.predicted !== r.label);
  return { bar: best.bar, f1: best.f1, precision: best.precision, recall: best.recall, misclassified };
}
