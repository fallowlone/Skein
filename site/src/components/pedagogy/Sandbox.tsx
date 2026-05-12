import type { ComponentChildren } from "preact";

type Props = { id: string; title: string; children: ComponentChildren };

export default function Sandbox({ id, title, children }: Props) {
  return (
    <section
      id={id}
      class="my-12 rounded-3xl border-4 border-dashed border-bbg-purple bg-panel-lilac p-8"
    >
      <div class="text-xs uppercase tracking-widest font-bold text-bbg-purple mb-1">Sandbox</div>
      <h2 class="text-2xl font-extrabold text-bbg-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}
