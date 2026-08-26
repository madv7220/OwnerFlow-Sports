import Link from "next/link";
import { BadgeCheck, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SPORT_LABELS } from "@/components/shared/sport-badge";
import { formatCents } from "@/lib/utils";

export type HandicapperCardData = {
  id: string;
  username: string;
  displayName: string;
  tagline: string | null;
  verified: boolean;
  specialties: string[];
  winCount: number;
  lossCount: number;
  roiPercent: number;
  ratingAvg: number;
  ratingCount: number;
  followerCount: number;
  cheapestTierCents: number | null;
};

export function HandicapperCard({ h }: { h: HandicapperCardData }) {
  const initials = h.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const winPct = h.winCount + h.lossCount > 0 ? (h.winCount / (h.winCount + h.lossCount)) * 100 : 0;

  return (
    <Link href={`/handicappers/${h.username}`}>
      <Card className="group h-full transition-colors hover:border-gold/50">
        <CardContent className="flex h-full flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="flex items-center gap-1 font-display text-base leading-tight group-hover:text-gold-bright">
                {h.displayName}
                {h.verified && <BadgeCheck className="size-4 text-gold" />}
              </span>
              <span className="text-xs text-muted-foreground">@{h.username}</span>
            </div>
          </div>

          {h.tagline && <p className="line-clamp-2 text-sm text-muted-foreground">{h.tagline}</p>}

          <div className="flex flex-wrap gap-1.5">
            {h.specialties.map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {SPORT_LABELS[s] ?? s}
              </Badge>
            ))}
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border/70 pt-3 text-center">
            <div>
              <div className="font-mono-num text-sm font-semibold text-emerald-bright">
                {winPct.toFixed(0)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Win rate</div>
            </div>
            <div>
              <div className="font-mono-num flex items-center justify-center gap-0.5 text-sm font-semibold">
                <TrendingUp className="size-3 text-gold" />
                {h.roiPercent > 0 ? "+" : ""}
                {h.roiPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">ROI</div>
            </div>
            <div>
              <div className="font-mono-num flex items-center justify-center gap-0.5 text-sm font-semibold">
                <Users className="size-3 text-gold" />
                {h.followerCount}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Followers</div>
            </div>
          </div>

          {h.cheapestTierCents !== null && (
            <div className="text-xs text-muted-foreground">
              Membership from{" "}
              <span className="font-semibold text-gold-bright">
                {formatCents(h.cheapestTierCents)}/mo
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
