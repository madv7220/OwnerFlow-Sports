import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext, hasAccess } from "@/lib/access";
import { PickCard, type PickCardData } from "@/components/picks/pick-card";
import { ParlayCard, type ParlayCardData } from "@/components/picks/parlay-card";
import { PicksFilterBar } from "@/components/picks/filter-bar";
import type { Sport } from "@prisma/client";

export const metadata = { title: "Picks & Parlays — OwnerFlow Sports" };

export default async function PicksPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string; type?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sport = params.sport ?? "all";
  const type = params.type === "parlays" ? "parlays" : "picks";
  const sort = params.sort ?? "newest";

  const session = await auth();
  const [access, pickRows, parlayRows] = await Promise.all([
    getAccessContext(session?.user?.id),
    type === "picks"
      ? prisma.pick.findMany({
          where: sport !== "all" ? { sport: sport as Sport } : undefined,
          include: {
            game: true,
            handicapper: { select: { id: true, displayName: true, verified: true, user: { select: { username: true } } } },
            tier: { select: { id: true, name: true } },
          },
          orderBy:
            sort === "confidence"
              ? { confidence: "desc" }
              : sort === "price_low"
                ? { priceCents: "asc" }
                : { publishedAt: "desc" },
          take: 60,
        })
      : Promise.resolve([]),
    type === "parlays"
      ? prisma.parlay.findMany({
          include: {
            legs: true,
            handicapper: { select: { id: true, displayName: true, user: { select: { username: true } } } },
            tier: { select: { id: true, name: true } },
          },
          orderBy: sort === "price_low" ? { priceCents: "asc" } : { publishedAt: "desc" },
          take: 40,
        })
      : Promise.resolve([]),
  ]);

  const picks: PickCardData[] = pickRows.map((p) => ({
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
      id: p.handicapper.id,
      displayName: p.handicapper.displayName,
      username: p.handicapper.user.username,
      verified: p.handicapper.verified,
    },
  }));

  const parlays: ParlayCardData[] = parlayRows.map((p) => ({
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
    handicapper: { id: p.handicapper.id, displayName: p.handicapper.displayName, username: p.handicapper.user.username },
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">The Marketplace</p>
        <h1 className="font-display text-3xl sm:text-4xl">Picks &amp; Parlays</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every pick is tied to a real handicapper record. Unlock individually, or subscribe to a
          handicapper&apos;s membership for full access to everything they publish.
        </p>
      </div>

      <div className="mb-6">
        <PicksFilterBar sport={sport} type={type} sort={sort} />
      </div>

      {type === "picks" ? (
        picks.length === 0 ? (
          <EmptyState label="picks" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((pick) => (
              <PickCard key={pick.id} pick={pick} unlocked={hasAccess(pick, "pick", access)} />
            ))}
          </div>
        )
      ) : parlays.length === 0 ? (
        <EmptyState label="parlays" />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {parlays.map((parlay) => (
            <ParlayCard key={parlay.id} parlay={parlay} unlocked={hasAccess(parlay, "parlay", access)} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-24 text-center text-muted-foreground">
      No {label} match these filters yet. Try a different sport.
    </div>
  );
}
