import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

type Step = { id: string; label: string; durationMs: number };
type Props = { id: string; steps: Step[]; loop?: boolean; lang?: "en" | "ru"; children?: ComponentChildren };

export default function Sequencer({ id, steps, loop = false, lang = "en", children }: Props) {
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
      class="my-8 rounded-[var(--r-lg)] border-[0.5px] border-hairline-2 bg-card p-6"
    >
      <div class="relative">{children}</div>
      <div class="mt-4 flex items-center gap-3">
        <button
          type="button"
          class="oa-btn oa-btn-ghost oa-btn-sm"
          onClick={() => setActive(Math.max(0, active - 1))}
          aria-label={lang === "en" ? "Previous step" : "Предыдущий шаг"}
        >
          ‹
        </button>
        <button
          type="button"
          class="oa-btn oa-btn-primary oa-btn-sm"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          class="oa-btn oa-btn-ghost oa-btn-sm"
          onClick={() => setActive(Math.min(steps.length - 1, active + 1))}
          aria-label={lang === "en" ? "Next step" : "Следующий шаг"}
        >
          ›
        </button>
        <span class="text-xs font-mono text-muted">
          {active + 1}/{steps.length} · {steps[active].label}
        </span>
      </div>
    </section>
  );
}
