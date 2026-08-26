import { prisma } from "@/lib/prisma";
import { HandicapperCard, type HandicapperCardData } from "@/components/handicappers/handicapper-card";

export const metadata = { title: "Handicappers — OwnerFlow Sports" };

export default async function HandicappersPage() {
  const handicappers = await prisma.handicapperProfile.findMany({
    include: {
      user: { select: { username: true } },
      followers: { select: { id: true } },
      tiers: { select: { priceCents: true }, orderBy: { priceCents: "asc" }, take: 1 },
    },
    orderBy: { roiPercent: "desc" },
  });

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
    ratingAvg: h.ratingAvg,
    ratingCount: h.ratingCount,
    followerCount: h.followers.length,
    cheapestTierCents: h.tiers[0]?.priceCents ?? null,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Vetted Experts</p>
        <h1 className="font-display text-3xl sm:text-4xl">Handicappers</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every record on OwnerFlow is tracked automatically — wins, losses, units, and ROI.
          Nothing self-reported.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((h) => (
          <HandicapperCard key={h.id} h={h} />
        ))}
      </div>
    </div>
  );
}
