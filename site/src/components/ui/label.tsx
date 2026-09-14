import type { JSX } from "preact";
import { cn } from "~/lib/utils";

type LabelProps = JSX.LabelHTMLAttributes<HTMLLabelElement> & {
  class?: string;
};

/** Field label — mono microcopy, shared by every form control. */
export function Label({ className, class: legacyClass, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        "mb-1.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted",
        legacyClass,
        className,
      )}
      {...props}
    />
  );
}
