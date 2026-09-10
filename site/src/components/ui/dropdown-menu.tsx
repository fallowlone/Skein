import type { ComponentChildren } from "preact";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = DropdownMenuPrimitive.Root as any;
const Trigger = DropdownMenuPrimitive.Trigger as any;
const Portal = DropdownMenuPrimitive.Portal as any;
const Content = DropdownMenuPrimitive.Content as any;
const Item = DropdownMenuPrimitive.Item as any;
const Separator = DropdownMenuPrimitive.Separator as any;

function DropdownMenu(props: Props) {
  return <Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger(props: Props) {
  return <Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuContent({ className, class: legacyClass, sideOffset = 4, ...props }: Props) {
  return (
    <Portal>
      <Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-40 overflow-hidden rounded-[var(--r-md)] border border-hairline-2 bg-card p-1 text-ink shadow-soft-md outline-none",
          legacyClass,
          className,
        )}
        {...props}
      />
    </Portal>
  );
}

function DropdownMenuItem({ className, class: legacyClass, ...props }: Props) {
  return (
    <Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[var(--r-sm)] px-3 py-2 text-[13px] text-ink-2 outline-none data-[highlighted]:bg-card-2 data-[highlighted]:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        legacyClass,
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, class: legacyClass, ...props }: Props) {
  return <Separator data-slot="dropdown-menu-separator" className={cn("-mx-1 my-1 h-px bg-hairline", legacyClass, className)} {...props} />;
}

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
