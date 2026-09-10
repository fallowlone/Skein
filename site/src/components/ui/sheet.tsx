import type { ComponentChildren } from "preact";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };
const Root = DialogPrimitive.Root as any;
const Trigger = DialogPrimitive.Trigger as any;
const Close = DialogPrimitive.Close as any;
const Portal = DialogPrimitive.Portal as any;
const Overlay = DialogPrimitive.Overlay as any;
const Content = DialogPrimitive.Content as any;
const Title = DialogPrimitive.Title as any;
const Description = DialogPrimitive.Description as any;

function Sheet(props: Props) {
  return <Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: Props) {
  return <Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: Props) {
  return <Close data-slot="sheet-close" {...props} />;
}

function SheetContent({ className, class: legacyClass, side = "right", children, ...props }: Props) {
  const sideClass = side === "left" ? "inset-y-0 left-0 border-r" : "inset-y-0 right-0 border-l";
  return (
    <Portal>
      <Overlay data-slot="sheet-overlay" className="fixed inset-0 z-50 bg-black/30" />
      <Content
        data-slot="sheet-content"
        className={cn("fixed z-50 h-full w-full max-w-md overflow-y-auto bg-paper shadow-soft-md outline-none", sideClass, legacyClass, className)}
        {...props}
      >
        {children}
      </Content>
    </Portal>
  );
}

function SheetTitle({ className, class: legacyClass, ...props }: Props) {
  return <Title data-slot="sheet-title" className={cn(legacyClass, className)} {...props} />;
}

function SheetDescription({ className, class: legacyClass, ...props }: Props) {
  return <Description data-slot="sheet-description" className={cn(legacyClass, className)} {...props} />;
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
