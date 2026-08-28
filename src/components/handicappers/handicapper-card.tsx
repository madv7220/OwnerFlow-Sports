import Link from "next/link";
import { BadgeCheck, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SPORT_LABELS } from "@/components/shared/sport-badge";
import { cn, formatCents } from "@/lib/utils";

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
  unitsNet: number;
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
              <div className="font-mono-num text-sm font-semibold text-foreground">
                {h.winCount}-{h.lossCount}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">
                Record · {winPct.toFixed(0)}%
              </div>
            </div>
            <div>
              <div
                className={cn(
                  "font-mono-num text-sm font-semibold",
                  h.unitsNet >= 0 ? "text-emerald-bright" : "text-red-300",
                )}
              >
                {h.unitsNet > 0 ? "+" : ""}
                {h.unitsNet.toFixed(1)}u
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Units</div>
            </div>
            <div>
              <div className="font-mono-num flex items-center justify-center gap-0.5 text-sm font-semibold">
                <TrendingUp className="size-3 text-gold" />
                {h.roiPercent > 0 ? "+" : ""}
                {h.roiPercent.toFixed(1)}%
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">ROI</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {h.cheapestTierCents !== null ? (
              <span>
                From{" "}
                <span className="font-semibold text-gold-bright">
                  {formatCents(h.cheapestTierCents)}/mo
                </span>
              </span>
            ) : (
              <span />
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {h.followerCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
