import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

type Step = { id: string; label: string; durationMs: number };
type Props = { id: string; steps: Step[]; loop?: boolean; children?: ComponentChildren };

export default function Sequencer({ id, steps, loop = false, children }: Props) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = window.setTimeout(() => {
      if (active + 1 >= steps.length) {
        if (loop) setActive(0);
        else setPlaying(false);
      } else {
        setActive(active + 1);
      }
    }, steps[active].durationMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [active, playing]);

  return (
    <section
      id={id}
      data-active-step={steps[active].id}
      class="my-8 rounded-2xl border-2 border-bbg-ink/10 bg-card p-6"
    >
      <div class="relative">{children}</div>
      <div class="mt-4 flex items-center gap-3">
        <button
          type="button"
          class="px-3 py-1 rounded border"
          onClick={() => setActive(Math.max(0, active - 1))}
          aria-label="Previous step"
        >
          ‹
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded bg-bbg-ink text-white"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          class="px-3 py-1 rounded border"
          onClick={() => setActive(Math.min(steps.length - 1, active + 1))}
          aria-label="Next step"
        >
          ›
        </button>
        <span class="text-xs font-mono text-bbg-muted">
          {active + 1}/{steps.length} · {steps[active].label}
        </span>
      </div>
    </section>
  );
}
