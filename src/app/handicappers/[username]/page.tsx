import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Coins, Radio, Star, TrendingUp, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext, hasAccess } from "@/lib/access";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SPORT_LABELS } from "@/components/shared/sport-badge";
import { PickCard, type PickCardData } from "@/components/picks/pick-card";
import { ParlayCard, type ParlayCardData } from "@/components/picks/parlay-card";
import { TierCard } from "@/components/handicappers/tier-card";
import { FollowButton } from "@/components/handicappers/follow-button";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username} — OwnerFlow Sports` };
}

export default async function HandicapperProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const session = await auth();

  const profile = await prisma.handicapperProfile.findFirst({
    where: { user: { username } },
    include: {
      user: true,
      tiers: { orderBy: { priceCents: "asc" } },
      followers: true,
      streams: { where: { status: "LIVE" }, take: 1 },
      picks: {
        include: { game: true, tier: { select: { id: true, name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 12,
      },
      parlays: {
        include: { legs: true, tier: { select: { id: true, name: true } } },
        orderBy: { publishedAt: "desc" },
        take: 6,
      },
    },
  });

  if (!profile) notFound();

  const access = await getAccessContext(session?.user?.id);
  const isFollowing = session?.user?.id
    ? profile.followers.some((f) => f.userId === session.user!.id)
    : false;

  const wins = profile.winCount;
  const losses = profile.lossCount;
  const winPct = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
  const specialties = profile.specialties.split(",");
  const initials = profile.displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const isLive = profile.streams.length > 0;

  const picks: PickCardData[] = profile.picks.map((p) => ({
    id: p.id,
    sport: p.sport,
    betType: p.betType,
    selection: p.selection,
    odds: p.odds,
    confidence: p.confidence,
    analysis: p.analysis,
    status: p.status,
    isFree: p.isFree,
    tierId: p.tierId,
    tierName: p.tier?.name ?? null,
    priceCents: p.priceCents,
    publishedAt: p.publishedAt,
    game: p.game,
    handicapper: {
      id: profile.id,
      displayName: profile.displayName,
      username: profile.user.username,
      verified: profile.verified,
    },
  }));

  const parlays: ParlayCardData[] = profile.parlays.map((p) => ({
    id: p.id,
    name: p.name,
    combinedOdds: p.combinedOdds,
    status: p.status,
    isFree: p.isFree,
    tierId: p.tierId,
    tierName: p.tier?.name ?? null,
    priceCents: p.priceCents,
    publishedAt: p.publishedAt,
    analysis: p.analysis,
    legs: p.legs,
    handicapper: { id: profile.id, displayName: profile.displayName, username: profile.user.username },
  }));

  return (
    <div>
      <div className="relative overflow-hidden border-b border-border/70 bg-gradient-to-b from-surface to-background">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 60% at 20% 0%, rgba(201,162,75,0.18), transparent), radial-gradient(ellipse 50% 50% at 90% 20%, rgba(31,138,95,0.14), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-20 ring-2 ring-gold/40">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl sm:text-3xl">{profile.displayName}</h1>
                  {profile.verified && <BadgeCheck className="size-5 text-gold" />}
                  {isLive && (
                    <Link href="/live">
                      <Badge variant="live" className="gap-1">
                        <Radio className="size-3" /> LIVE
                      </Badge>
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{profile.user.username}</p>
                {profile.tagline && (
                  <p className="mt-1 max-w-lg text-sm text-foreground/80">{profile.tagline}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {specialties.map((s) => (
                    <Badge key={s} variant="secondary" className="text-[10px]">
                      {SPORT_LABELS[s] ?? s}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <FollowButton handicapperId={profile.id} initiallyFollowing={isFollowing} />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile icon={<Trophy className="size-4 text-gold" />} label="Record" value={`${wins}-${losses}-${profile.pushCount}`} />
            <StatTile icon={<TrendingUp className="size-4 text-emerald-bright" />} label="Win Rate" value={`${winPct.toFixed(1)}%`} />
            <StatTile
              icon={<Coins className="size-4 text-emerald-bright" />}
              label="Units Net"
              value={`${profile.unitsNet > 0 ? "+" : ""}${profile.unitsNet.toFixed(1)}u`}
            />
            <StatTile icon={<TrendingUp className="size-4 text-gold" />} label="ROI" value={`${profile.roiPercent > 0 ? "+" : ""}${profile.roiPercent.toFixed(1)}%`} />
            <StatTile icon={<Star className="size-4 text-gold" />} label="Rating" value={`${profile.ratingAvg.toFixed(1)} (${profile.ratingCount})`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Record derived from {wins + losses + profile.pushCount} graded wagers — updated
            automatically when games finish.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="mb-12">
          <h2 className="font-display text-xl mb-4">Membership tiers</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {profile.tiers.map((t, i) => (
              <TierCard
                key={t.id}
                id={t.id}
                name={t.name}
                priceCents={t.priceCents}
                interval={t.interval}
                description={t.description}
                perks={t.perks.split("|")}
                accentColor={t.accentColor}
                isSubscribed={access.subscribedTierIds.has(t.id)}
                featured={i === 1}
              />
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="font-display text-xl mb-4">Recent picks</h2>
          {picks.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No picks published yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {picks.map((pick) => (
                <PickCard key={pick.id} pick={pick} unlocked={hasAccess(pick, "pick", access)} />
              ))}
            </div>
          )}
        </section>

        {parlays.length > 0 && (
          <section>
            <h2 className="font-display text-xl mb-4">Recent parlays</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {parlays.map((parlay) => (
                <ParlayCard key={parlay.id} parlay={parlay} unlocked={hasAccess(parlay, "parlay", access)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/60 p-4">
      <div className="mb-1 flex items-center gap-1.5">{icon}</div>
      <div className="font-mono-num text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}
