import { ICON_PATHS, type IconName } from "./paths";

type Props = {
  name: IconName;
  /** Forwarded to the <svg>; controls colour (via currentColor) and size. */
  class?: string;
  /** Explicit px size; omit when a class (e.g. `h-4 w-4`) controls dimensions. */
  size?: number;
  strokeWidth?: number;
};

const DEFAULT_STROKE = 1.6;

// Renders a registry glyph in the standard 24×24 line-art shell. Colour comes
// from the parent via currentColor; the icon is decorative, so the accessible
// name lives on the parent element. Path strings are first-party (paths.ts),
// not user input — injecting them as inner HTML is safe here.
export default function Icon({ name, class: cls, size, strokeWidth = DEFAULT_STROKE }: Props) {
  return (
    <svg
      class={cls}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name].join("") }}
    />
  );
}
