import Link from "next/link";
import { BadgeCheck, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type LeaderboardEntry = {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  winCount: number;
  lossCount: number;
  pushCount: number;
  unitsNet: number;
  roiPercent: number;
};

const RANK_STYLES = [
  "border-gold/60 bg-primary/15 text-gold-bright",
  "border-border bg-surface-3 text-foreground/80",
  "border-[#7a4b23]/50 bg-[#7a4b23]/15 text-[#d09a63]",
];

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="flex items-center gap-2 border-b border-border/70 px-5 py-3.5">
        <Trophy className="size-4 text-gold" />
        <h2 className="font-display text-base">Units leaderboard</h2>
        <span className="ml-auto text-xs text-muted-foreground">Ranked by net units · graded results</span>
      </div>

      <div className="hidden grid-cols-[3rem_1fr_7rem_6rem_6rem] gap-3 border-b border-border/60 px-5 py-2 text-[10px] tracking-wide text-muted-foreground uppercase sm:grid">
        <span>Rank</span>
        <span>Handicapper</span>
        <span className="text-right">Record</span>
        <span className="text-right">Units</span>
        <span className="text-right">ROI</span>
      </div>

      {entries.map((entry, i) => (
        <Link
          key={entry.id}
          href={`/handicappers/${entry.username}`}
          className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-border/50 px-5 py-3 transition-colors last:border-0 hover:bg-surface-2/50 sm:grid-cols-[3rem_1fr_7rem_6rem_6rem]"
        >
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-md border font-mono-num text-xs font-semibold",
              RANK_STYLES[i] ?? "border-border bg-surface-2 text-muted-foreground",
            )}
          >
            {i + 1}
          </span>

          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">
                {entry.displayName
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">{entry.displayName}</span>
            {entry.verified && <BadgeCheck className="size-3.5 shrink-0 text-gold" />}
          </span>

          <span className="hidden text-right font-mono-num text-xs text-muted-foreground sm:block">
            {entry.winCount}-{entry.lossCount}
            {entry.pushCount > 0 ? `-${entry.pushCount}` : ""}
          </span>

          <span
            className={cn(
              "text-right font-mono-num text-sm font-semibold",
              entry.unitsNet >= 0 ? "text-emerald-bright" : "text-red-300",
            )}
          >
            {entry.unitsNet > 0 ? "+" : ""}
            {entry.unitsNet.toFixed(1)}u
          </span>

          <span className="hidden text-right font-mono-num text-sm text-gold-bright sm:block">
            {entry.roiPercent > 0 ? "+" : ""}
            {entry.roiPercent.toFixed(1)}%
          </span>
        </Link>
      ))}
    </Card>
  );
}
