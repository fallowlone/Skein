import type { ComponentChildren } from "preact";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "~/lib/utils";

type Props = Record<string, any> & { children?: ComponentChildren; class?: string; className?: string };
const Root = TabsPrimitive.Root as any;
const List = TabsPrimitive.List as any;
const Trigger = TabsPrimitive.Trigger as any;
const Content = TabsPrimitive.Content as any;

function Tabs(props: Props) {
  return <Root data-slot="tabs" {...props} />;
}

function TabsList({ className, class: legacyClass, ...props }: Props) {
  return <List data-slot="tabs-list" className={cn("inline-flex items-center", legacyClass, className)} {...props} />;
}

function TabsTrigger({ className, class: legacyClass, ...props }: Props) {
  return (
    <Trigger
      data-slot="tabs-trigger"
      className={cn("outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50", legacyClass, className)}
      {...props}
    />
  );
}

function TabsContent({ className, class: legacyClass, ...props }: Props) {
  return <Content data-slot="tabs-content" className={cn("outline-none", legacyClass, className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
