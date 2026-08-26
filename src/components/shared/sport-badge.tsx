import { cn } from "@/lib/utils";

export const SPORT_LABELS: Record<string, string> = {
  NFL: "NFL",
  NBA: "NBA",
  MLB: "MLB",
  NHL: "NHL",
  NCAAF: "NCAA Football",
  NCAAB: "NCAA Basketball",
  SOCCER: "Soccer",
  MMA: "MMA",
  TENNIS: "Tennis",
  GOLF: "Golf",
};

export function SportBadge({ sport, className }: { sport: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      {SPORT_LABELS[sport] ?? sport}
    </span>
  );
}
