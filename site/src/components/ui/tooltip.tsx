import type { ComponentChildren } from "preact";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Provider = TooltipPrimitive.Provider as any;
const Root = TooltipPrimitive.Root as any;
const Trigger = TooltipPrimitive.Trigger as any;
const Portal = TooltipPrimitive.Portal as any;
const Content = TooltipPrimitive.Content as any;
const Arrow = TooltipPrimitive.Arrow as any;

function TooltipProvider({ delayDuration = 300, ...props }: Props) {
  return <Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip(props: Props) {
  return <Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger(props: Props) {
  return <Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({ className, class: legacyClass, sideOffset = 6, children, ...props }: Props) {
  return (
    <Portal>
      <Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-64 overflow-hidden rounded-[var(--r-sm)] border border-hairline-2 bg-ink px-2.5 py-1.5 font-mono text-[11px] leading-snug text-paper shadow-soft-md animate-reveal-up",
          legacyClass,
          className,
        )}
        {...props}
      >
        {children}
        <Arrow data-slot="tooltip-arrow" className="fill-ink" width={10} height={5} />
      </Content>
    </Portal>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent };
