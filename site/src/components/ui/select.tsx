import type { ComponentChildren } from "preact";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";
import { Icon } from "./icon";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = SelectPrimitive.Root as any;
const Group = SelectPrimitive.Group as any;
const Value = SelectPrimitive.Value as any;
const Trigger = SelectPrimitive.Trigger as any;
const Portal = SelectPrimitive.Portal as any;
const Content = SelectPrimitive.Content as any;
const Viewport = SelectPrimitive.Viewport as any;
const Item = SelectPrimitive.Item as any;
const ItemText = SelectPrimitive.ItemText as any;
const ItemIndicator = SelectPrimitive.ItemIndicator as any;
const ScrollUp = SelectPrimitive.ScrollUpButton as any;
const ScrollDown = SelectPrimitive.ScrollDownButton as any;
const Label = SelectPrimitive.Label as any;
const Separator = SelectPrimitive.Separator as any;

function Select(props: Props) {
  return <Root data-slot="select" {...props} />;
}

function SelectGroup(props: Props) {
  return <Group data-slot="select-group" {...props} />;
}

function SelectValue(props: Props) {
  return <Value data-slot="select-value" {...props} />;
}

function SelectTrigger({ className, class: legacyClass, children, ...props }: Props) {
  return (
    <Trigger
      data-slot="select-trigger"
      className={cn(
        "group flex h-9 w-full items-center justify-between gap-2 rounded-[var(--r-sm)] border border-hairline-2 bg-paper px-3 py-1 text-sm text-ink shadow-soft-sm outline-none transition-[border-color,box-shadow] duration-[var(--dur-2)] focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent data-[placeholder]:text-muted disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
        legacyClass,
        className,
      )}
      {...props}
    >
      {children}
      <Icon
        name="chevron-down"
        size={15}
        className="text-muted transition-transform duration-[var(--dur-2)] group-data-[state=open]:rotate-180"
      />
    </Trigger>
  );
}

function SelectContent({ className, class: legacyClass, position = "popper", ...props }: Props) {
  return (
    <Portal>
      <Content
        data-slot="select-content"
        position={position}
        className={cn(
          "relative z-50 max-h-72 min-w-32 overflow-hidden rounded-[var(--r-md)] border border-hairline-2 bg-card text-ink shadow-soft-md outline-none animate-reveal-up data-[state=closed]:animate-none",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          legacyClass,
          className,
        )}
        {...props}
      >
        <ScrollUp data-slot="select-scroll-up" className="flex items-center justify-center py-1 text-muted">
          <Icon name="chevron-down" size={14} className="rotate-180" />
        </ScrollUp>
        <Viewport data-slot="select-viewport" className="p-1">
          {props.children}
        </Viewport>
        <ScrollDown data-slot="select-scroll-down" className="flex items-center justify-center py-1 text-muted">
          <Icon name="chevron-down" size={14} />
        </ScrollDown>
      </Content>
    </Portal>
  );
}

function SelectLabel({ className, class: legacyClass, ...props }: Props) {
  return (
    <Label
      data-slot="select-label"
      className={cn("px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted", legacyClass, className)}
      {...props}
    />
  );
}

function SelectItem({ className, class: legacyClass, children, ...props }: Props) {
  return (
    <Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center gap-2 rounded-[var(--r-sm)] py-1.5 pl-8 pr-3 text-[13px] text-ink-2 outline-none transition-colors duration-[var(--dur-1)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-card-2 data-[highlighted]:text-ink data-[state=checked]:text-ink",
        legacyClass,
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex size-4 items-center justify-center">
        <ItemIndicator data-slot="select-item-indicator" className="mk-pop text-accent">
          <Icon name="check" size={14} />
        </ItemIndicator>
      </span>
      <ItemText data-slot="select-item-text">{children}</ItemText>
    </Item>
  );
}

function SelectSeparator({ className, class: legacyClass, ...props }: Props) {
  return <Separator data-slot="select-separator" className={cn("-mx-1 my-1 h-px bg-hairline", legacyClass, className)} {...props} />;
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
