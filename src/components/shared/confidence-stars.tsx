import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConfidenceStars({ confidence, className }: { confidence: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-0.5", className)} title={`${confidence}/5 confidence`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Flame
          key={i}
          className={cn(
            "size-3.5",
            i < confidence ? "fill-gold text-gold" : "fill-transparent text-border",
          )}
        />
      ))}
    </div>
  );
}
