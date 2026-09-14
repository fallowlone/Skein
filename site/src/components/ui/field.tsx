import type { ComponentChildren } from "preact";
import { cn } from "~/lib/utils";
import { Label } from "./label";
import { Icon, type IconName } from "./icon";

type FieldProps = {
  label?: ComponentChildren;
  hint?: ComponentChildren;
  error?: ComponentChildren;
  htmlFor?: string;
  required?: boolean;
  invalid?: boolean;
  children?: ComponentChildren;
  class?: string;
  className?: string;
};

/**
 * Field — label + control + hint/error in one unit.
 * - `error` wins over `hint`; sets `data-invalid` for control styling.
 * - Hint/error IDs are derived from `htmlFor`; controls that render a message
 *   should reference that ID with `aria-describedby`.
 */
export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  invalid,
  children,
  class: legacyClass,
  className,
}: FieldProps) {
  const isInvalid = invalid ?? Boolean(error);
  const labelId = htmlFor ? `${htmlFor}-label` : undefined;
  const messageId = htmlFor ? (error ? `${htmlFor}-error` : hint ? `${htmlFor}-hint` : undefined) : undefined;
  return (
    <div data-slot="field" data-invalid={isInvalid ? "true" : undefined} className={cn("min-w-0", legacyClass, className)}>
      {label ? (
        <Label for={htmlFor} id={labelId}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-1 text-danger">
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      <div data-slot="field-control">{children}</div>
      {error ? (
        <p id={messageId} role="alert" className="mt-1.5 flex items-center gap-1.5 text-[12px] text-danger">
          <Icon name="alert-circle" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export type FieldIcon = IconName;
