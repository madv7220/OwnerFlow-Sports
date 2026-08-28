import Link from "next/link";
import { DollarSign, Plus, Radio, Target, TrendingUp, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireHandicapperProfile } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { SportBadge } from "@/components/shared/sport-badge";
import { formatCents, timeAgo } from "@/lib/utils";

export const metadata = { title: "Studio — OwnerFlow Sports" };

export default async function StudioPage() {
  const { profile } = await requireHandicapperProfile();

  const [picks, parlays, tiers, streams, followerCount, subscriberCount] = await Promise.all([
    prisma.pick.findMany({
      where: { handicapperId: profile.id },
      include: { game: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    prisma.parlay.count({ where: { handicapperId: profile.id } }),
    prisma.membershipTier.findMany({ where: { handicapperId: profile.id } }),
    prisma.stream.findMany({ where: { handicapperId: profile.id }, orderBy: { id: "desc" }, take: 3 }),
    prisma.follow.count({ where: { handicapperId: profile.id } }),
    prisma.subscription.count({ where: { tier: { handicapperId: profile.id }, status: "ACTIVE" } }),
  ]);

  const winPct = profile.winCount + profile.lossCount > 0 ? (profile.winCount / (profile.winCount + profile.lossCount)) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Handicapper Studio</p>
          <h1 className="font-display text-3xl">Welcome back, {profile.displayName.split(" ")[0]}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/studio/streams/new">
              <Radio className="size-3.5" /> Schedule stream
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/studio/parlays/new">
              <Plus className="size-3.5" /> New parlay
            </Link>
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/studio/picks/new">
              <Plus className="size-3.5" /> New pick
            </Link>
          </Button>
        </div>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={<DollarSign className="size-4 text-gold" />} label="Total earnings" value={formatCents(profile.earningsCents)} />
        <StatCard icon={<Target className="size-4 text-gold" />} label="Win rate" value={`${winPct.toFixed(1)}%`} />
        <StatCard icon={<TrendingUp className="size-4 text-gold" />} label="ROI" value={`${profile.roiPercent > 0 ? "+" : ""}${profile.roiPercent.toFixed(1)}%`} />
        <StatCard icon={<Users className="size-4 text-gold" />} label="Followers / Subscribers" value={`${followerCount} / ${subscriberCount}`} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl">Recent picks</h2>
            <span className="text-xs text-muted-foreground">{parlays} parlays published</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {picks.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  You haven&apos;t published a pick yet.{" "}
                  <Link href="/studio/picks/new" className="text-gold-bright hover:underline">
                    Create your first one
                  </Link>
                  .
                </CardContent>
              </Card>
            )}
            {picks.map((p) => (
              <Link key={p.id} href={`/picks/${p.id}`}>
                <Card className="transition-colors hover:border-gold/40">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-3">
                      <SportBadge sport={p.sport} />
                      <div>
                        <div className="text-sm font-medium">{p.selection}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.game.awayTeam} @ {p.game.homeTeam} · {timeAgo(p.publishedAt)}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Membership tiers
                <Button asChild size="sm" variant="ghost">
                  <Link href="/studio/tiers">Manage</Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tiers yet.</p>
              ) : (
                tiers.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-mono-num text-gold-bright">{formatCents(t.priceCents)}/mo</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Streams</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {streams.length === 0 ? (
                <p className="text-sm text-muted-foreground">No streams yet.</p>
              ) : (
                streams.map((s) => (
                  <Link
                    key={s.id}
                    href={`/live/${s.id}`}
                    className="flex items-center justify-between rounded-md border border-border/70 bg-surface-2/50 px-3 py-2 text-sm hover:border-gold/40"
                  >
                    <span className="line-clamp-1">{s.title}</span>
                    <Badge variant={s.status === "LIVE" ? "live" : "secondary"} className="text-[10px]">
                      {s.status}
                    </Badge>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-1.5">{icon}</div>
        <div className="font-mono-num text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );
}
