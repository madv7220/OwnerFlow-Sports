import Link from "next/link";
import { ArrowRight, BadgeCheck, LineChart, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HandicapperCard, type HandicapperCardData } from "@/components/handicappers/handicapper-card";
import { SPORT_LABELS } from "@/components/shared/sport-badge";

export default async function Home() {
  const [topHandicappers, pickCount, handicapperCount, liveCount, sportsTracked] = await Promise.all([
    prisma.handicapperProfile.findMany({
      include: {
        user: { select: { username: true } },
        followers: { select: { id: true } },
        tiers: { select: { priceCents: true }, orderBy: { priceCents: "asc" }, take: 1 },
      },
      orderBy: { roiPercent: "desc" },
      take: 3,
    }),
    prisma.pick.count(),
    prisma.handicapperProfile.count(),
    prisma.stream.count({ where: { status: "LIVE" } }),
    prisma.game.groupBy({ by: ["sport"] }),
  ]);

  const featured: HandicapperCardData[] = topHandicappers.map((h) => ({
    id: h.id,
    username: h.user.username,
    displayName: h.displayName,
    tagline: h.tagline,
    verified: h.verified,
    specialties: h.specialties.split(","),
    winCount: h.winCount,
    lossCount: h.lossCount,
    roiPercent: h.roiPercent,
    ratingAvg: h.ratingAvg,
    ratingCount: h.ratingCount,
    followerCount: h.followers.length,
    cheapestTierCents: h.tiers[0]?.priceCents ?? null,
  }));

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 60% at 15% -10%, rgba(201,162,75,0.16), transparent), radial-gradient(ellipse 60% 50% at 100% 10%, rgba(31,138,95,0.12), transparent)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="default" className="mb-6 gap-1.5">
              <Sparkles className="size-3" /> The research desk for serious bettors
            </Badge>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Elite sports picks,{" "}
              <span className="gold-gradient-text">sold by the people who make them.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              OwnerFlow Sports is a marketplace and research platform where vetted handicappers
              publish picks, parlays, and live analysis — and you buy exactly the access you want.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/register">
                  Join OwnerFlow <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/picks">Browse today&apos;s picks</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              New members get $500 in demo credit to explore the marketplace instantly.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat value={handicapperCount} label="Handicappers" />
            <Stat value={pickCount} label="Picks Tracked" />
            <Stat value={sportsTracked.length} label="Sports Covered" />
            <Stat value={liveCount} label="Live Right Now" live={liveCount > 0} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">How it works</p>
          <h2 className="font-display text-3xl">Built like a trading desk, not a tip sheet</h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="size-5 text-gold" />}
            title="Verified records"
            body="Every win, loss, push, and unit is tracked automatically the moment a game closes. No self-reported records."
          />
          <FeatureCard
            icon={<LineChart className="size-5 text-gold" />}
            title="Buy exactly what you want"
            body="Unlock a single pick, subscribe to a handicapper's own membership, or grab an OwnerFlow platform tier for curated access."
          />
          <FeatureCard
            icon={<Radio className="size-5 text-gold" />}
            title="Live, not static"
            body="Real-time feed, line-movement alerts, and live analysis rooms — handicappers stream their process, not just their conclusions."
          />
        </div>
      </section>

      {/* Featured handicappers */}
      {featured.length > 0 && (
        <section className="border-y border-border/70 bg-surface/40 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Top rated</p>
                <h2 className="font-display text-3xl">This week&apos;s leaders</h2>
              </div>
              <Button asChild variant="ghost" className="hidden gap-1.5 sm:flex">
                <Link href="/handicappers">
                  View all <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {featured.map((h) => (
                <HandicapperCard key={h.id} h={h} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sell your picks */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-gold/20">
          <CardContent className="grid grid-cols-1 gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge className="mb-4 gap-1.5">
                <BadgeCheck className="size-3.5" /> For handicappers
              </Badge>
              <h2 className="font-display text-3xl leading-tight">
                Turn your track record into a business.
              </h2>
              <p className="mt-4 text-muted-foreground">
                Set your own membership tiers, sell picks and parlays individually, stream your
                analysis live, and get paid — all while remaining a member on the platform
                yourself. Your picks, your pricing, your audience.
              </p>
              <Button asChild size="lg" className="mt-6">
                <Link href="/register?role=HANDICAPPER">Start selling picks</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <MetricTile value="80%" label="Revenue share to handicappers" />
              <MetricTile value="0" label="Setup fees" />
              <MetricTile value="3" label="Tiers per handicapper" />
              <MetricTile value="Live" label="Streaming built in" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sports coverage strip */}
      <section className="border-t border-border/70 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 sm:px-6 lg:px-8">
          {Object.values(SPORT_LABELS).map((label) => (
            <span key={label} className="text-sm font-medium tracking-wide text-muted-foreground/70">
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label, live }: { value: number; label: string; live?: boolean }) {
  return (
    <div className="text-center">
      <div className="font-mono-num flex items-center justify-center gap-1.5 text-3xl font-semibold text-foreground">
        {live && <span className="live-dot inline-block size-2 rounded-full bg-crimson" />}
        {value}
      </div>
      <div className="mt-1 text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex size-10 items-center justify-center rounded-md bg-surface-2">{icon}</div>
        <h3 className="font-display text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-2/60 p-4 text-center">
      <div className="font-mono-num text-2xl font-semibold text-gold-bright">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
