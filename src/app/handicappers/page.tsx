import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HandicapperCard, type HandicapperCardData } from "@/components/handicappers/handicapper-card";
import { Leaderboard, type LeaderboardEntry } from "@/components/handicappers/leaderboard";
import { SPORT_LABELS } from "@/components/shared/sport-badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Handicappers — OwnerFlow Sports" };

const SORTS = {
  roi: { label: "ROI", orderBy: { roiPercent: "desc" } },
  units: { label: "Units won", orderBy: { unitsNet: "desc" } },
  wins: { label: "Total wins", orderBy: { winCount: "desc" } },
  rating: { label: "Rating", orderBy: { ratingAvg: "desc" } },
} satisfies Record<string, { label: string; orderBy: Prisma.HandicapperProfileOrderByWithRelationInput }>;

type SortKey = keyof typeof SORTS;

export default async function HandicappersPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; sport?: string }>;
}) {
  const params = await searchParams;
  const sort: SortKey = params.sort && params.sort in SORTS ? (params.sort as SortKey) : "roi";
  const sport = params.sport && params.sport in SPORT_LABELS ? params.sport : "all";

  const where =
    sport !== "all" ? { specialties: { contains: sport } } : {};

  const [handicappers, leaders, allSpecialties] = await Promise.all([
    prisma.handicapperProfile.findMany({
      where,
      include: {
        user: { select: { username: true } },
        followers: { select: { id: true } },
        tiers: { select: { priceCents: true }, orderBy: { priceCents: "asc" }, take: 1 },
      },
      orderBy: SORTS[sort].orderBy,
    }),
    prisma.handicapperProfile.findMany({
      include: { user: { select: { username: true } } },
      orderBy: { unitsNet: "desc" },
      take: 5,
    }),
    prisma.handicapperProfile.findMany({ select: { specialties: true } }),
  ]);

  // Only offer sport filters that would actually return someone.
  const coveredSports = new Set(allSpecialties.flatMap((h) => h.specialties.split(",")));

  const data: HandicapperCardData[] = handicappers.map((h) => ({
    id: h.id,
    username: h.user.username,
    displayName: h.displayName,
    tagline: h.tagline,
    verified: h.verified,
    specialties: h.specialties.split(","),
    winCount: h.winCount,
    lossCount: h.lossCount,
    roiPercent: h.roiPercent,
    unitsNet: h.unitsNet,
    ratingAvg: h.ratingAvg,
    ratingCount: h.ratingCount,
    followerCount: h.followers.length,
    cheapestTierCents: h.tiers[0]?.priceCents ?? null,
  }));

  const leaderboard: LeaderboardEntry[] = leaders.map((h) => ({
    id: h.id,
    username: h.user.username,
    displayName: h.displayName,
    verified: h.verified,
    winCount: h.winCount,
    lossCount: h.lossCount,
    pushCount: h.pushCount,
    unitsNet: h.unitsNet,
    roiPercent: h.roiPercent,
  }));

  const buildHref = (next: { sort?: string; sport?: string }) => {
    const qs = new URLSearchParams();
    const s = next.sort ?? sort;
    const sp = next.sport ?? sport;
    if (s !== "roi") qs.set("sort", s);
    if (sp !== "all") qs.set("sport", sp);
    const q = qs.toString();
    return q ? `/handicappers?${q}` : "/handicappers";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Vetted Experts</p>
        <h1 className="font-display text-3xl sm:text-4xl">Handicappers</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every record here is computed from graded results — wins, losses, units, and ROI are
          derived automatically when games finish. Nothing is self-reported.
        </p>
      </div>

      <div className="mb-10">
        <Leaderboard entries={leaderboard} />
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sport</span>
          {["all", ...Object.keys(SPORT_LABELS).filter((s) => coveredSports.has(s))].map((s) => (
            <Link
              key={s}
              href={buildHref({ sport: s })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sport === s
                  ? "border-gold/50 bg-primary/15 text-gold-bright"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : SPORT_LABELS[s]}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Sort by</span>
          {(Object.keys(SORTS) as SortKey[]).map((key) => (
            <Link
              key={key}
              href={buildHref({ sort: key })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sort === key
                  ? "border-gold/50 bg-primary/15 text-gold-bright"
                  : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {SORTS[key].label}
            </Link>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-muted-foreground">
          No handicappers cover this sport yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((h) => (
            <HandicapperCard key={h.id} h={h} />
          ))}
        </div>
      )}
    </div>
  );
}
