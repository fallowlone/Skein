import type { ComponentChildren } from "preact";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";
import { Icon } from "./icon";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };

const Root = DialogPrimitive.Root as any;
const Trigger = DialogPrimitive.Trigger as any;
const Close = DialogPrimitive.Close as any;
const Portal = DialogPrimitive.Portal as any;
const Overlay = DialogPrimitive.Overlay as any;
const Content = DialogPrimitive.Content as any;
const Title = DialogPrimitive.Title as any;
const Description = DialogPrimitive.Description as any;

function Dialog(props: Props) {
  return <Root data-slot="dialog" {...props} />;
}

function DialogTrigger(props: Props) {
  return <Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogClose(props: Props) {
  return <Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, class: legacyClass, ...props }: Props) {
  return (
    <Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-[reveal-up_180ms_ease-out] data-[state=closed]:opacity-0",
        legacyClass,
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  class: legacyClass,
  children,
  showClose = true,
  closeLabel = "Close dialog",
  ...props
}: Props & { showClose?: boolean; closeLabel?: string }) {
  return (
    <Portal>
      <DialogOverlay />
      <Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-[var(--r-md)] border border-hairline-2 bg-card p-6 text-ink shadow-soft-md outline-none",
          legacyClass,
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <Close
            data-slot="dialog-x"
            aria-label={closeLabel}
            className="absolute right-3 top-3 rounded-[var(--r-sm)] p-1 text-muted outline-none transition-colors duration-[var(--dur-1)] hover:bg-card-2 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name="x" size={15} />
          </Close>
        ) : null}
      </Content>
    </Portal>
  );
}

function DialogHeader({ className, class: legacyClass, ...props }: Props) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 text-left", legacyClass, className)} {...props} />;
}

function DialogFooter({ className, class: legacyClass, ...props }: Props) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", legacyClass, className)}
      {...props}
    />
  );
}

function DialogTitle({ className, class: legacyClass, ...props }: Props) {
  return (
    <Title
      data-slot="dialog-title"
      className={cn("font-display text-lg font-semibold leading-tight text-ink", legacyClass, className)}
      {...props}
    />
  );
}

function DialogDescription({ className, class: legacyClass, ...props }: Props) {
  return <Description data-slot="dialog-description" className={cn("text-sm leading-relaxed text-muted", legacyClass, className)} {...props} />;
}

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
