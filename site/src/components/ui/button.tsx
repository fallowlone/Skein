import type { JSX } from "preact";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "~/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        inherit: "",
        default: "bg-accent text-on-accent hover:bg-accent-2",
        destructive: "border border-danger bg-transparent text-danger hover:bg-card",
        outline: "border border-hairline-2 bg-card text-ink hover:border-hairline-strong",
        secondary: "border border-hairline-2 bg-card text-ink hover:bg-card-2",
        ghost: "bg-transparent text-ink-2 hover:bg-card hover:text-ink",
        link: "bg-transparent p-0 text-accent underline-offset-4 hover:underline",
      },
      size: {
        inherit: "",
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "inherit",
      size: "inherit",
    },
  },
);

type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "tabindex"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    class?: string;
    tabindex?: number | string;
  };

function Button({ className, class: legacyClass, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = (asChild ? Slot.Root : "button") as any;
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "inherit"}
      data-size={size ?? "inherit"}
      className={cn(buttonVariants({ variant, size }), legacyClass, className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
