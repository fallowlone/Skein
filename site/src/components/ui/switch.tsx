import type { ComponentChildren } from "preact";
import { Switch as SwitchPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = SwitchPrimitive.Root as any;
const Thumb = SwitchPrimitive.Thumb as any;

function Switch({ className, class: legacyClass, ...props }: Props) {
  return (
    <Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-[var(--r-pill)] border border-hairline-2 bg-card-2 px-0.5 outline-none transition-[background-color,border-color,box-shadow] duration-[var(--dur-2)] focus-visible:ring-2 focus-visible:ring-accent data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        legacyClass,
        className,
      )}
      {...props}
    >
      <Thumb
        data-slot="switch-thumb"
        className="block size-3.5 rounded-full bg-paper shadow-soft-sm transition-transform duration-[var(--dur-2)] data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
      />
    </Root>
  );
}

export { Switch };
