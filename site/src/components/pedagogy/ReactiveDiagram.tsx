import { useState } from "preact/hooks";
import type { JSX } from "preact";

type Input = {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  default: number;
  unit?: string;
};

type Props<D extends Record<string, number> = Record<string, number>> = {
  id: string;
  inputs: Input[];
  compute: (vals: Record<string, number>) => D;
  render: (vals: Record<string, number>, derived: D) => JSX.Element;
};

export default function ReactiveDiagram({ id, inputs, compute, render }: Props) {
  const init = Object.fromEntries(inputs.map((i) => [i.name, i.default]));
  const [vals, setVals] = useState<Record<string, number>>(init);
  const derived = compute(vals);
  return (
    <section id={id} class="my-8 rounded-[var(--r-lg)] border-[0.5px] border-accent bg-card p-6">
      <div class="grid grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)] gap-6">
        <div>
          <ul class="space-y-4 list-none p-0">
            {inputs.map((i) => (
              <li key={i.name}>
                <label class="text-xs font-bold text-muted uppercase tracking-wider">
                  {i.label}
                </label>
                <input
                  type="range"
                  min={i.min}
                  max={i.max}
                  step={i.step ?? 1}
                  value={vals[i.name]}
                  onInput={(e) =>
                    setVals({
                      ...vals,
                      [i.name]: Number((e.target as HTMLInputElement).value),
                    })
                  }
                  class="w-full"
                />
                <div class="text-sm font-mono text-ink">
                  {vals[i.name]}
                  {i.unit ?? ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>{render(vals, derived)}</div>
      </div>
    </section>
  );
}
