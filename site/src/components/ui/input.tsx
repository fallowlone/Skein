import type { JSX } from "preact";
import { cn } from "~/lib/utils";

type InputProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "spellcheck"> & {
  class?: string;
  spellcheck?: boolean | string;
};

function Input({ className, class: legacyClass, type, spellcheck, ...props }: InputProps) {
  const controlClass =
    type === "checkbox"
      ? "size-4 rounded border border-hairline-2 accent-accent focus-visible:ring-2 focus-visible:ring-accent"
      : type === "range"
        ? "w-full accent-accent focus-visible:outline-none"
        : "flex h-9 w-full rounded-[var(--r-sm)] border border-hairline-2 bg-paper px-3 py-1 text-sm text-ink shadow-soft-sm outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium";

  const spellCheck = typeof spellcheck === "string" ? spellcheck !== "false" : spellcheck;
  return <input data-slot="input" type={type} spellcheck={spellCheck} className={cn(controlClass, legacyClass, className)} {...props} />;
}

export { Input };
