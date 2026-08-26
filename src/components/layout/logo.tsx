import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex items-center gap-2 font-display text-xl tracking-tight",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-md border border-gold/40 bg-gradient-to-br from-surface-3 to-surface-2 text-gold-bright shadow-[0_0_16px_-4px_rgba(201,162,75,0.6)] transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none">
          <path
            d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path d="M12 7.5 L16.5 12 L12 16.5 L7.5 12 Z" fill="currentColor" opacity="0.9" />
        </svg>
      </span>
      <span>
        <span className="gold-gradient-text font-semibold">OwnerFlow</span>{" "}
        <span className="font-light text-foreground/80">Sports</span>
      </span>
    </Link>
  );
}
