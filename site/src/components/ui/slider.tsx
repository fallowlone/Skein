import type { ComponentChildren } from "preact";
import { Slider as SliderPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = SliderPrimitive.Root as any;
const Track = SliderPrimitive.Track as any;
const Range = SliderPrimitive.Range as any;
const Thumb = SliderPrimitive.Thumb as any;

function Slider({ className, class: legacyClass, id, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }: Props) {
  const labelledBy = ariaLabelledBy ?? (id ? `${id}-label` : undefined);
  return (
    <Root
      data-slot="slider"
      id={id}
      className={cn(
        "relative flex h-5 w-full touch-none select-none items-center outline-none disabled:opacity-50",
        legacyClass,
        className,
      )}
      {...props}
    >
      <Track
        data-slot="slider-track"
        className="relative h-1.5 w-full grow overflow-hidden rounded-[var(--r-pill)] bg-card-2"
      >
        <Range data-slot="slider-range" className="absolute h-full bg-accent" />
      </Track>
      <Thumb
        data-slot="slider-thumb"
        aria-label={labelledBy ? undefined : (ariaLabel ?? "Value")}
        aria-labelledby={labelledBy}
        className="block size-4 shrink-0 cursor-grab rounded-full border border-hairline-2 bg-paper shadow-soft-sm outline-none transition-[box-shadow,transform] duration-[var(--dur-1)] hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing active:scale-105 disabled:pointer-events-none"
      />
    </Root>
  );
}

export { Slider };
