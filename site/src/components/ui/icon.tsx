import type { JSX } from "preact";
import { cn } from "~/lib/utils";

/**
 * Tiny inline Lucide-style icon set (stroke=currentColor, 24 viewBox).
 * Inline on purpose: `lucide-react` is a React lib and would ride the
 * client bundle into every form island; these ~10 paths cost bytes, not KB.
 * Add new entries by copying the path data from lucide.dev.
 */
export type IconName =
  | "search"
  | "x"
  | "eye"
  | "eye-off"
  | "lock"
  | "upload"
  | "alert-circle"
  | "check"
  | "chevron-down"
  | "calendar"
  | "minus"
  | "plus"
  | "send";

const PATHS: Record<IconName, JSX.Element> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </>
  ),
  x: (
    <>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M9.88 9.88a3 3 0 104.24 4.24" />
      <path d="M10.73 5.08A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a13.2 13.2 0 01-1.67 2.68" />
      <path d="M6.61 6.61A13.5 13.5 0 002 12s3.5 7 10 7a9.7 9.7 0 005.39-1.61" />
      <path d="M2 2l20 20" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </>
  ),
  upload: (
    <>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </>
  ),
  "alert-circle": (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </>
  ),
  check: <path d="M20 6L9 17l-5-5" />,
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  send: (
    <>
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </>
  ),
};

type IconProps = JSX.SVGAttributes<SVGSVGElement> & {
  name: IconName;
  size?: number | string;
  class?: string;
};

export function Icon({ name, size = 16, className, class: legacyClass, ...props }: IconProps) {
  return (
    <svg
      data-slot="icon"
      data-icon={name}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", legacyClass, className)}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
