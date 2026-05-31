import type { ComponentChildren } from "preact";

type Props = { id: string; title: string; children: ComponentChildren };

export default function Sandbox({ id, title, children }: Props) {
  return (
    <section
      id={id}
      class="my-12 rounded-[var(--r-lg)] border-2 border-dashed border-accent bg-accent-ghost p-8"
    >
      <div class="text-xs uppercase tracking-widest font-bold text-accent mb-1">Sandbox</div>
      <h2 class="text-2xl font-extrabold text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}
