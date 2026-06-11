// site/src/english/daily.ts
// The methodology's daily cycle as data: SRS (15′) → comprehensible input (45′ target) →
// output (15′, writing/speaking alternating by day parity). Pure; the hub renders it.
export interface DailyBlock {
  key: "srs" | "input" | "output";
  targetMin: number;
  remainingMin: number;
  mode?: "writing" | "speaking";
  dueCount?: number;
}

export interface DailyInputs {
  dueCount: number;
  todaySrsMin: number;
  todayInputMin: number;
  todayOutputMin: number;
  dayOfMonth: number;
}

const SRS_MIN = 15, INPUT_MIN = 45, OUTPUT_MIN = 15;

export function dailyPlan(i: DailyInputs): DailyBlock[] {
  const rem = (target: number, done: number) => Math.max(0, target - done);
  return [
    { key: "srs", targetMin: SRS_MIN, remainingMin: rem(SRS_MIN, i.todaySrsMin), dueCount: i.dueCount },
    { key: "input", targetMin: INPUT_MIN, remainingMin: rem(INPUT_MIN, i.todayInputMin) },
    { key: "output", targetMin: OUTPUT_MIN, remainingMin: rem(OUTPUT_MIN, i.todayOutputMin), mode: i.dayOfMonth % 2 === 0 ? "speaking" : "writing" },
  ];
}
