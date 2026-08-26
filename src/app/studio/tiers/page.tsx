import { prisma } from "@/lib/prisma";
import { requireHandicapperProfile } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTierForm } from "@/components/studio/new-tier-form";
import { formatCents } from "@/lib/utils";

export const metadata = { title: "Manage Tiers — OwnerFlow Sports" };

export default async function StudioTiersPage() {
  const { profile } = await requireHandicapperProfile();

  const tiers = await prisma.membershipTier.findMany({
    where: { handicapperId: profile.id },
    include: { subscriptions: { where: { status: "ACTIVE" } } },
    orderBy: { priceCents: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl mb-8">Membership tiers</h1>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex flex-col gap-2 p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base">{t.name}</h3>
                <span className="font-mono-num text-gold-bright">{formatCents(t.priceCents)}/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">{t.description}</p>
              <p className="text-xs text-muted-foreground">{t.subscriptions.length} active subscribers</p>
            </CardContent>
          </Card>
        ))}
        {tiers.length === 0 && (
          <p className="col-span-full text-muted-foreground">No tiers yet — create your first below.</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create a new tier</CardTitle>
        </CardHeader>
        <CardContent>
          <NewTierForm />
        </CardContent>
      </Card>
    </div>
  );
}
