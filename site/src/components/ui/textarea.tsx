import type { JSX } from "preact";
import { cn } from "~/lib/utils";

type TextareaProps = Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "spellcheck"> & {
  class?: string;
  rows?: number | string;
  spellcheck?: boolean | string;
  state?: "default" | "error" | "success";
  /** Renders a `value.length / maxLength` counter. */
  showCount?: boolean;
};

function Textarea({
  className,
  class: legacyClass,
  rows,
  spellcheck,
  state = "default",
  showCount,
  maxLength,
  value,
  ...props
}: TextareaProps) {
  const rowCount = typeof rows === "string" ? Number(rows) : rows;
  const spellCheck = typeof spellcheck === "string" ? spellcheck !== "false" : spellcheck;
  const count = typeof value === "string" ? value.length : undefined;
  return (
    <span data-slot="textarea-wrap" className="block w-full">
      <textarea
        data-slot="textarea"
        data-state={state !== "default" ? state : undefined}
        rows={rowCount}
        spellcheck={spellCheck}
        maxLength={maxLength}
        value={value}
        className={cn(
          "flex min-h-20 w-full rounded-[var(--r-sm)] border bg-paper px-3 py-2 text-sm text-ink shadow-soft-sm outline-none transition-[border-color,box-shadow] duration-[var(--dur-2)] placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50",
          state === "error"
            ? "border-danger focus-visible:border-danger focus-visible:ring-danger mk-shake"
            : state === "success"
              ? "border-ok focus-visible:border-ok focus-visible:ring-ok"
              : "border-hairline-2",
          "data-[invalid=true]:border-danger data-[invalid=true]:focus-visible:border-danger data-[invalid=true]:focus-visible:ring-danger",
          legacyClass,
          className,
        )}
        {...props}
      />
      {showCount && typeof maxLength === "number" && count !== undefined ? (
        <span className="mt-1 block text-right font-mono text-[11px] text-muted" aria-live="off">
          {count}/{maxLength}
        </span>
      ) : null}
    </span>
  );
}

export { Textarea };
