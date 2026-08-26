import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-surface-2 px-3 py-2 text-sm placeholder:text-muted-foreground outline-none transition-colors focus-visible:border-gold focus-visible:ring-1 focus-visible:ring-gold disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
