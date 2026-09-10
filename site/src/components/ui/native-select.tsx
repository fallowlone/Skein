import type { JSX } from "preact";
import { cn } from "~/lib/utils";

type NativeSelectProps = JSX.SelectHTMLAttributes<HTMLSelectElement> & { class?: string };

function NativeSelect({ className, class: legacyClass, children, ...props }: NativeSelectProps) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-9 rounded-[var(--r-sm)] border border-hairline-2 bg-paper px-3 pr-8 text-sm text-ink shadow-soft-sm outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
        legacyClass,
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { NativeSelect };
