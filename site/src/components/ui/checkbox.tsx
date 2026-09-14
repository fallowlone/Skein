import type { ComponentChildren } from "preact";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";
import { Icon } from "./icon";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = CheckboxPrimitive.Root as any;
const Indicator = CheckboxPrimitive.Indicator as any;

function Checkbox({ className, class: legacyClass, ...props }: Props) {
  return (
    <Root
      data-slot="checkbox"
      className={cn(
        "peer flex size-4 shrink-0 items-center justify-center rounded border border-hairline-2 bg-paper text-on-accent shadow-soft-sm outline-none transition-[background-color,border-color,box-shadow,transform] duration-[var(--dur-2)] focus-visible:ring-2 focus-visible:ring-accent active:scale-95 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[state=checked]:border-accent data-[state=checked]:bg-accent",
        legacyClass,
        className,
      )}
      {...props}
    >
      <Indicator data-slot="checkbox-indicator" className="flex items-center justify-center text-current">
        <Icon name="check" size={12} className="mk-pop" />
      </Indicator>
    </Root>
  );
}

export { Checkbox };
