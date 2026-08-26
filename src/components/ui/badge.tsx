import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-gold-bright border-primary/30",
        secondary: "bg-surface-2 text-foreground border-border",
        outline: "text-foreground border-border",
        emerald: "bg-emerald/15 text-emerald-bright border-emerald/30",
        crimson: "bg-crimson/15 text-red-300 border-crimson/40",
        live: "bg-crimson/15 text-red-300 border-crimson/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
