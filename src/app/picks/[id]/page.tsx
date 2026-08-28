import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, CalendarClock, Lock, MapPin, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext, hasAccess } from "@/lib/access";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SportBadge } from "@/components/shared/sport-badge";
import { OddsPill } from "@/components/shared/odds-pill";
import { ConfidenceStars } from "@/components/shared/confidence-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { UnlockButton } from "@/components/picks/unlock-button";
import { settleUnits } from "@/lib/grading";
import { formatOdds, timeAgo } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pick = await prisma.pick.findUnique({
    where: { id },
    select: { selection: true, handicapper: { select: { displayName: true } } },
  });
  if (!pick) return { title: "Pick not found — OwnerFlow Sports" };
  return { title: `${pick.selection} by ${pick.handicapper.displayName} — OwnerFlow Sports` };
}

export default async function PickDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const pick = await prisma.pick.findUnique({
    where: { id },
    include: {
      game: true,
      tier: { select: { id: true, name: true } },
      handicapper: {
        include: { user: { select: { username: true } } },
      },
    },
  });

  if (!pick) notFound();

  const access = await getAccessContext(session?.user?.id);
  const unlocked = hasAccess(pick, "pick", access);

  const h = pick.handicapper;
  const winPct =
    h.winCount + h.lossCount > 0 ? (h.winCount / (h.winCount + h.lossCount)) * 100 : 0;
  const initials = h.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  const settledUnits =
    pick.status === "PENDING" ? null : settleUnits(pick.status, pick.odds, pick.unitsRisked);

  const relatedPicks = await prisma.pick.findMany({
    where: { gameId: pick.gameId, id: { not: pick.id } },
    include: { handicapper: { select: { displayName: true, user: { select: { username: true } } } } },
    take: 4,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/picks" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to marketplace
      </Link>

      <Card className="mt-4">
        <CardContent className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <SportBadge sport={pick.sport} />
            <Badge variant="secondary">{pick.betType}</Badge>
            <StatusBadge status={pick.status} />
            {pick.isFree && <Badge variant="emerald">Free pick</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              Published {timeAgo(pick.publishedAt)}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h1 className="font-display text-3xl leading-tight sm:text-4xl">{pick.selection}</h1>
              <OddsPill odds={pick.odds} />
            </div>
            <p className="mt-2 text-muted-foreground">
              {pick.game.awayTeam} <span className="text-foreground/50">@</span> {pick.game.homeTeam}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Confidence">
              <ConfidenceStars confidence={pick.confidence} />
            </Stat>
            <Stat label="Units risked">
              <span className="font-mono-num text-sm">{pick.unitsRisked}u</span>
            </Stat>
            <Stat label="Odds">
              <span className="font-mono-num text-sm">{formatOdds(pick.odds)}</span>
            </Stat>
            <Stat label="Result">
              {settledUnits === null ? (
                <span className="text-sm text-muted-foreground">Pending</span>
              ) : (
                <span
                  className={
                    settledUnits > 0
                      ? "font-mono-num text-sm text-emerald-bright"
                      : settledUnits < 0
                        ? "font-mono-num text-sm text-red-300"
                        : "font-mono-num text-sm text-muted-foreground"
                  }
                >
                  {settledUnits > 0 ? "+" : ""}
                  {Math.round(settledUnits * 100) / 100}u
                </span>
              )}
            </Stat>
          </div>

          <div className="rounded-lg border border-border/70 bg-surface-2/50 p-4">
            <div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5" />
                {pick.game.startTime.toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {pick.game.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {pick.game.venue}
                </span>
              )}
              <Link href={`/scores?sport=${pick.sport}`} className="text-gold-bright hover:underline">
                View full board →
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MarketCell label="Spread" value={pick.game.spread !== null ? `${pick.game.spread}` : "—"} />
              <MarketCell label="Total" value={pick.game.total !== null ? `o/u ${pick.game.total}` : "—"} />
              <MarketCell
                label="Moneyline"
                value={
                  pick.game.moneyAway !== null && pick.game.moneyHome !== null
                    ? `${formatOdds(pick.game.moneyAway)} / ${formatOdds(pick.game.moneyHome)}`
                    : "—"
                }
              />
            </div>
          </div>

          <div>
            <h2 className="mb-2 font-display text-lg">The analysis</h2>
            {unlocked ? (
              <p className="leading-relaxed text-muted-foreground">{pick.analysis}</p>
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-dashed border-border p-6">
                <p className="pointer-events-none blur-[5px] select-none leading-relaxed text-muted-foreground">
                  {pick.analysis}
                </p>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card/80 px-4 text-center">
                  <Lock className="size-5 text-gold" />
                  <p className="text-sm text-muted-foreground">
                    {pick.priceCents
                      ? "Unlock this pick to read the full breakdown."
                      : `Included with ${pick.tier?.name ?? "a membership"}.`}
                  </p>
                  {pick.priceCents ? (
                    <UnlockButton kind="pick" id={pick.id} priceCents={pick.priceCents} />
                  ) : (
                    <Button asChild size="sm">
                      <Link href={`/handicappers/${h.user.username}`}>
                        View {h.displayName.split(" ")[0]}&apos;s memberships
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-5">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <Link href={`/handicappers/${h.user.username}`} className="group flex items-center gap-3">
            <Avatar className="size-12">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-1.5 font-display text-base group-hover:text-gold-bright">
                {h.displayName}
                {h.verified && <BadgeCheck className="size-4 text-gold" />}
              </div>
              <div className="text-xs text-muted-foreground">
                {h.winCount}-{h.lossCount}-{h.pushCount} · {winPct.toFixed(1)}% ·{" "}
                <span className="text-gold-bright">
                  {h.roiPercent > 0 ? "+" : ""}
                  {h.roiPercent.toFixed(1)}% ROI
                </span>
              </div>
            </div>
          </Link>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/handicappers/${h.user.username}`}>
              <TrendingUp className="size-3.5" /> Full record &amp; memberships
            </Link>
          </Button>
        </CardContent>
      </Card>

      {relatedPicks.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg">Other picks on this game</h2>
          <div className="flex flex-col gap-2">
            {relatedPicks.map((r) => (
              <Link key={r.id} href={`/picks/${r.id}`}>
                <Card className="transition-colors hover:border-gold/40">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm font-medium">{r.selection}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.handicapper.displayName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <OddsPill odds={r.odds} />
                      <StatusBadge status={r.status} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-2/50 p-3">
      <div className="mb-1 text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      {children}
    </div>
  );
}

function MarketCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="font-mono-num text-sm">{value}</div>
    </div>
  );
}
