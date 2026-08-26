import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SportBadge } from "@/components/shared/sport-badge";
import { OddsPill } from "@/components/shared/odds-pill";
import { ConfidenceStars } from "@/components/shared/confidence-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { UnlockButton } from "@/components/picks/unlock-button";
import { timeAgo } from "@/lib/utils";

export type PickCardData = {
  id: string;
  sport: string;
  betType: string;
  selection: string;
  odds: number;
  confidence: number;
  analysis: string;
  status: string;
  isFree: boolean;
  tierId: string | null;
  tierName: string | null;
  priceCents: number | null;
  publishedAt: Date;
  game: { homeTeam: string; awayTeam: string; startTime: Date };
  handicapper: { id: string; displayName: string; username: string; verified: boolean };
};

export function PickCard({ pick, unlocked }: { pick: PickCardData; unlocked: boolean }) {
  const initials = pick.handicapper.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <Link
          href={`/handicappers/${pick.handicapper.username}`}
          className="flex items-center gap-2.5 group"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="flex items-center gap-1 text-sm font-medium group-hover:text-gold-bright">
              {pick.handicapper.displayName}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(pick.publishedAt)}</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <SportBadge sport={pick.sport} />
          <StatusBadge status={pick.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div className="rounded-md border border-border/70 bg-surface-2/60 px-3 py-2 text-sm text-muted-foreground">
          {pick.game.awayTeam} <span className="text-foreground/60">@</span> {pick.game.homeTeam}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-lg leading-snug">{pick.selection}</div>
          <OddsPill odds={pick.odds} />
        </div>

        <div className="flex items-center justify-between">
          <ConfidenceStars confidence={pick.confidence} />
          <Badge variant="secondary" className="text-[10px]">
            {pick.betType}
          </Badge>
        </div>

        {unlocked ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{pick.analysis}</p>
        ) : (
          <div className="relative">
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground/40 select-none">
              {pick.analysis}
            </p>
            <div className="absolute inset-0 flex items-center justify-center gap-1.5 rounded-md bg-gradient-to-t from-card via-card/95 to-card/60 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> Full analysis locked
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {pick.isFree ? (
            <Badge variant="emerald">Free pick</Badge>
          ) : unlocked ? (
            <Badge variant="default">
              {pick.tierName ? `Included · ${pick.tierName}` : "Unlocked"}
            </Badge>
          ) : pick.priceCents ? (
            <UnlockButton kind="pick" id={pick.id} priceCents={pick.priceCents} />
          ) : pick.tierId ? (
            <Link
              href={`/handicappers/${pick.handicapper.username}`}
              className="text-xs text-gold-bright hover:underline"
            >
              Subscribe to {pick.tierName ?? "unlock"} →
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
