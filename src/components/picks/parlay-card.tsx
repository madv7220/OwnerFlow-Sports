import Link from "next/link";
import { Lock, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { OddsPill } from "@/components/shared/odds-pill";
import { StatusBadge } from "@/components/shared/status-badge";
import { UnlockButton } from "@/components/picks/unlock-button";
import { timeAgo } from "@/lib/utils";

export type ParlayCardData = {
  id: string;
  name: string;
  combinedOdds: number;
  status: string;
  isFree: boolean;
  tierId: string | null;
  tierName: string | null;
  priceCents: number | null;
  publishedAt: Date;
  analysis: string;
  legs: { id: string; selection: string; betType: string; odds: number }[];
  handicapper: { id: string; displayName: string; username: string };
};

export function ParlayCard({ parlay, unlocked }: { parlay: ParlayCardData; unlocked: boolean }) {
  const initials = parlay.handicapper.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="flex flex-col overflow-hidden border-gold/20">
      <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
        <Link
          href={`/handicappers/${parlay.handicapper.username}`}
          className="flex items-center gap-2.5 group"
        >
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium group-hover:text-gold-bright">
              {parlay.handicapper.displayName}
            </span>
            <span className="text-xs text-muted-foreground">{timeAgo(parlay.publishedAt)}</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="gap-1">
            <Link2 className="size-3" /> {parlay.legs.length}-Leg
          </Badge>
          <StatusBadge status={parlay.status} />
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <div className="flex items-center justify-between gap-2">
          <div className="font-display text-lg leading-snug">{parlay.name}</div>
          <OddsPill odds={parlay.combinedOdds} />
        </div>

        <ul className="flex flex-col gap-1.5">
          {(unlocked ? parlay.legs : parlay.legs.slice(0, 1)).map((leg, i) => (
            <li
              key={leg.id}
              className="flex items-center justify-between rounded-md border border-border/70 bg-surface-2/60 px-3 py-1.5 text-sm"
            >
              <span className="text-muted-foreground">
                Leg {i + 1}: <span className="text-foreground">{leg.selection}</span>
              </span>
              <span className="font-mono-num text-xs text-muted-foreground">{leg.betType}</span>
            </li>
          ))}
          {!unlocked && parlay.legs.length > 1 && (
            <li className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-xs text-muted-foreground">
              <Lock className="size-3.5" /> {parlay.legs.length - 1} more leg
              {parlay.legs.length - 1 > 1 ? "s" : ""} locked
            </li>
          )}
        </ul>

        {unlocked && (
          <p className="text-sm leading-relaxed text-muted-foreground">{parlay.analysis}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {parlay.isFree ? (
            <Badge variant="emerald">Free parlay</Badge>
          ) : unlocked ? (
            <Badge variant="default">
              {parlay.tierName ? `Included · ${parlay.tierName}` : "Unlocked"}
            </Badge>
          ) : parlay.priceCents ? (
            <UnlockButton kind="parlay" id={parlay.id} priceCents={parlay.priceCents} />
          ) : parlay.tierId ? (
            <Link
              href={`/handicappers/${parlay.handicapper.username}`}
              className="text-xs text-gold-bright hover:underline"
            >
              Subscribe to {parlay.tierName ?? "unlock"} →
            </Link>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
