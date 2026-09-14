import type { ComponentChildren } from "preact";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = PopoverPrimitive.Root as any;
const Trigger = PopoverPrimitive.Trigger as any;
const Portal = PopoverPrimitive.Portal as any;
const Content = PopoverPrimitive.Content as any;
const Close = PopoverPrimitive.Close as any;

function Popover(props: Props) {
  return <Root data-slot="popover" {...props} />;
}

function PopoverTrigger(props: Props) {
  return <Trigger data-slot="popover-trigger" {...props} />;
}

function PopoverClose(props: Props) {
  return <Close data-slot="popover-close" {...props} />;
}

function PopoverContent({ className, class: legacyClass, sideOffset = 6, align = "center", ...props }: Props) {
  return (
    <Portal>
      <Content
        data-slot="popover-content"
        sideOffset={sideOffset}
        align={align}
        className={cn(
          "z-50 w-72 origin-[var(--radix-popover-content-transform-origin)] rounded-[var(--r-md)] border border-hairline-2 bg-card p-4 text-ink shadow-soft-md outline-none animate-reveal-up",
          legacyClass,
          className,
        )}
        {...props}
      />
    </Portal>
  );
}

export { Popover, PopoverTrigger, PopoverClose, PopoverContent };
