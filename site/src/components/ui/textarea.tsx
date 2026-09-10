import type { JSX } from "preact";
import { cn } from "~/lib/utils";

type TextareaProps = Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "spellcheck"> & {
  class?: string;
  rows?: number | string;
  spellcheck?: boolean | string;
};

function Textarea({ className, class: legacyClass, rows, spellcheck, ...props }: TextareaProps) {
  const rowCount = typeof rows === "string" ? Number(rows) : rows;
  const spellCheck = typeof spellcheck === "string" ? spellcheck !== "false" : spellcheck;
  return (
    <textarea
      data-slot="textarea"
      rows={rowCount}
      spellcheck={spellCheck}
      className={cn(
        "flex min-h-20 w-full rounded-[var(--r-sm)] border border-hairline-2 bg-paper px-3 py-2 text-sm text-ink shadow-soft-sm outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
        legacyClass,
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
