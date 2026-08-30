import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/access";
import { TierCard } from "@/components/handicappers/tier-card";
import { isStripeEnabled } from "@/lib/stripe";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Membership — OwnerFlow Sports" };

export default async function PricingPage() {
  const session = await auth();
  const [tiers, access, handicapperCount] = await Promise.all([
    prisma.membershipTier.findMany({
      where: { isPlatform: true },
      orderBy: { priceCents: "asc" },
    }),
    getAccessContext(session?.user?.id),
    prisma.handicapperProfile.count(),
  ]);

  const stripeEnabled = isStripeEnabled();

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Membership</p>
        <h1 className="font-display text-3xl sm:text-4xl">Two ways to unlock the desk</h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Subscribe to an OwnerFlow platform tier for curated picks and full feed access, or go
          direct to a specific handicapper&apos;s own membership for everything they publish.
        </p>
      </div>

      <div className="mb-16 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tiers.map((t, i) => (
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
            stripeEnabled={stripeEnabled}
          />
        ))}
      </div>

      <Card className="border-gold/20 bg-surface/60">
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <h2 className="font-display text-2xl">Prefer to follow one expert?</h2>
          <p className="max-w-xl text-muted-foreground">
            Every one of our {handicapperCount} handicappers sells their own membership tiers
            directly on their profile — priced and structured however they choose.
          </p>
          <Button asChild size="lg">
            <Link href="/handicappers">Browse handicappers</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
