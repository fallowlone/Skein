import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { cn } from "~/lib/utils";
import { Icon, type IconName } from "./icon";

type InputProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "spellcheck" | "prefix"> & {
  class?: string;
  spellcheck?: boolean | string;
  /** Leading decoration icon (e.g. "search", "lock", "calendar"). */
  leadingIcon?: IconName;
  /** Trailing decoration icon. Ignored when `clearable`/`passwordToggle` render a button. */
  trailingIcon?: IconName;
  /** "error" | "success" tint + shake/pop affordance hook. */
  state?: "default" | "error" | "success";
  /** Shows an X button that clears the value. */
  clearable?: boolean;
  onClear?: () => void;
  /** Renders an eye toggle for type="password". */
  passwordToggle?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

const INVALID_RING =
  "data-[invalid=true]:border-danger data-[invalid=true]:focus-visible:border-danger data-[invalid=true]:focus-visible:ring-danger";

function InputChromeIcon({ name, tone }: { name: IconName; tone: string }) {
  return (
    <span className={cn("pointer-events-none absolute right-3 top-1/2 -translate-y-1/2", tone)}>
      <Icon name={name} size={15} />
    </span>
  );
}

function Input({
  className,
  class: legacyClass,
  type,
  spellcheck,
  leadingIcon,
  trailingIcon,
  state = "default",
  clearable,
  onClear,
  passwordToggle,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
  ...props
}: InputProps) {
  const [revealed, setRevealed] = useState(false);
  const controlClass =
    type === "checkbox" || type === "radio"
      ? "size-4 shrink-0 rounded border border-hairline-2 accent-accent outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
      : type === "range"
        ? "w-full accent-accent focus-visible:outline-none"
        : "flex h-9 w-full rounded-[var(--r-sm)] border border-hairline-2 bg-paper px-3 py-1 text-sm text-ink shadow-soft-sm outline-none transition-colors placeholder:text-muted focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium";

  const spellCheck = typeof spellcheck === "string" ? spellcheck !== "false" : spellcheck;
  const isPassword = type === "password";
  const showToggle = Boolean(isPassword && passwordToggle);
  const resolvedType = isPassword && revealed ? "text" : type;
  const controlledValue = (props as { value?: unknown }).value;
  const isControlled = typeof controlledValue === "string";
  // Uncontrolled hydrated inputs have no `value` prop — track non-emptiness
  // locally so `clearable` still works. SSR-safe:
  // initial state matches first render, no mismatch.
  const [hasText, setHasText] = useState(() => {
    if (isControlled) return (controlledValue as string).length > 0;
    const dv = (props as { defaultValue?: unknown }).defaultValue;
    return typeof dv === "string" && dv.length > 0;
  });
  const showClear = Boolean(clearable && !props.disabled && (isControlled ? (controlledValue as string).length > 0 : hasText));
  // Split the consumer's onInput out of the spread so our tracking wrapper
  // is the single handler (duplicate JSX props only warn, but keep it clean).
  const { onInput: consumerOnInput, ...restProps } = props as {
    onInput?: (e: JSX.TargetedEvent<HTMLInputElement, Event>) => void;
    [k: string]: unknown;
  };
  const handleInput = (e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    if (!isControlled) setHasText(Boolean((e.target as HTMLInputElement).value));
    consumerOnInput?.(e);
  };
  const chromeIcon: IconName | null =
    state === "error" ? "alert-circle" : state === "success" ? "check" : (trailingIcon ?? null);
  const needsWrap = Boolean(leadingIcon || showClear || showToggle || chromeIcon || state !== "default");

  const inputEl = (
    <input
      data-slot="input"
      data-state={state !== "default" ? state : undefined}
      type={resolvedType}
      spellcheck={spellCheck}
      onInput={handleInput}
      className={cn(
        controlClass,
        leadingIcon ? "pl-9 pr-3" : null,
        showClear || showToggle || chromeIcon ? "pr-9" : null,
        state === "error" ? "border-danger mk-shake" : state === "success" ? "border-ok" : null,
        INVALID_RING,
        legacyClass,
        className,
      )}
      {...restProps}
    />
  );
  if (!needsWrap) return inputEl;
  return (
    <span data-slot="input-wrap" className="group relative block w-full min-w-0">
      {leadingIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted transition-colors duration-[var(--dur-2)] group-focus-within:text-accent">
          <Icon name={leadingIcon} size={15} />
        </span>
      ) : null}
      {inputEl}
      {showClear ? (
        <button
          type="button"
          aria-label="Clear input"
          onClick={(e) => {
            onClear?.();
            const root = (e.currentTarget as HTMLButtonElement).parentElement;
            const el = root?.querySelector("input");
            if (el) {
              el.value = "";
              if (!isControlled) setHasText(false);
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.focus();
            }
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[var(--r-sm)] p-0.5 text-muted opacity-0 outline-none transition-opacity duration-[var(--dur-1)] hover:text-ink focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent group-focus-within:opacity-100"
        >
          <Icon name="x" size={14} />
        </button>
      ) : showToggle ? (
        <button
          type="button"
          aria-label={revealed ? hidePasswordLabel : showPasswordLabel}
          aria-pressed={revealed}
          onClick={() => setRevealed((v) => !v)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[var(--r-sm)] p-0.5 text-muted outline-none transition-colors duration-[var(--dur-1)] hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Icon name={revealed ? "eye-off" : "eye"} size={15} />
        </button>
      ) : chromeIcon ? (
        <InputChromeIcon
          name={chromeIcon}
          tone={state === "error" ? "text-danger" : state === "success" ? "text-ok mk-pop" : "text-muted"}
        />
      ) : null}
    </span>
  );
}

export { Input };
