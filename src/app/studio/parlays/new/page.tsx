import { prisma } from "@/lib/prisma";
import { requireHandicapperProfile } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParlayForm } from "@/components/studio/parlay-form";

export const metadata = { title: "New Parlay — OwnerFlow Sports" };

export default async function NewParlayPage() {
  const { profile } = await requireHandicapperProfile();

  const [games, tiers] = await Promise.all([
    prisma.game.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      orderBy: { startTime: "asc" },
      take: 40,
    }),
    prisma.membershipTier.findMany({ where: { handicapperId: profile.id } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Build a new parlay</CardTitle>
        </CardHeader>
        <CardContent>
          <ParlayForm games={games} tiers={tiers.map((t) => ({ id: t.id, name: t.name }))} />
        </CardContent>
      </Card>
    </div>
  );
}
