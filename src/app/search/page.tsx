import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { HandicapperCard, type HandicapperCardData } from "@/components/handicappers/handicapper-card";
import { Card, CardContent } from "@/components/ui/card";
import { SportBadge } from "@/components/shared/sport-badge";
import { OddsPill } from "@/components/shared/odds-pill";

export const metadata = { title: "Search — OwnerFlow Sports" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  if (!query) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        Enter a search term to find handicappers, picks, or teams.
      </div>
    );
  }

  const [handicappers, picks] = await Promise.all([
    prisma.handicapperProfile.findMany({
      where: {
        OR: [
          { displayName: { contains: query } },
          { tagline: { contains: query } },
          { user: { username: { contains: query } } },
        ],
      },
      include: {
        user: { select: { username: true } },
        followers: { select: { id: true } },
        tiers: { select: { priceCents: true }, orderBy: { priceCents: "asc" }, take: 1 },
      },
      take: 12,
    }),
    prisma.pick.findMany({
      where: {
        OR: [
          { selection: { contains: query } },
          { game: { homeTeam: { contains: query } } },
          { game: { awayTeam: { contains: query } } },
        ],
      },
      include: { game: true, handicapper: { select: { displayName: true, user: { select: { username: true } } } } },
      take: 12,
    }),
  ]);

  const handicapperData: HandicapperCardData[] = handicappers.map((h) => ({
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

  const noResults = handicapperData.length === 0 && picks.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="mb-8 text-muted-foreground">
        Results for <span className="text-foreground">&ldquo;{query}&rdquo;</span>
      </p>

      {noResults && (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-muted-foreground">
          No matches. Try a team name, handicapper, or sport.
        </div>
      )}

      {handicapperData.length > 0 && (
        <section className="mb-12">
          <h2 className="font-display text-xl mb-4">Handicappers</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {handicapperData.map((h) => (
              <HandicapperCard key={h.id} h={h} />
            ))}
          </div>
        </section>
      )}

      {picks.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-4">Picks</h2>
          <div className="flex flex-col gap-3">
            {picks.map((p) => (
              <Link key={p.id} href={`/picks/${p.id}`}>
                <Card className="transition-colors hover:border-gold/40">
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <SportBadge sport={p.sport} />
                      <div>
                        <div className="text-sm font-medium">{p.selection}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.game.awayTeam} @ {p.game.homeTeam} · {p.handicapper.displayName}
                        </div>
                      </div>
                    </div>
                    <OddsPill odds={p.odds} />
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
