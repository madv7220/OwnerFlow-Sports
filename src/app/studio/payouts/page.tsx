import { prisma } from "@/lib/prisma";
import { requireHandicapperProfile } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PayoutPanel } from "@/components/studio/payout-panel";
import { isStripeEnabled, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { formatCents, timeAgo } from "@/lib/utils";

export const metadata = { title: "Payouts — OwnerFlow Sports" };

export default async function PayoutsPage() {
  const { profile } = await requireHandicapperProfile();

  const payouts = await prisma.payout.findMany({
    where: { handicapperId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 25,
  });

  const owed = profile.earningsCents - profile.paidOutCents;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Handicapper Studio</p>
        <h1 className="font-display text-3xl">Payouts</h1>
        <p className="mt-2 text-muted-foreground">
          You keep {100 - PLATFORM_FEE_PERCENT}% of every pick sale and subscription. OwnerFlow
          keeps {PLATFORM_FEE_PERCENT}%.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Lifetime earnings" value={formatCents(profile.earningsCents)} />
        <Stat label="Paid out" value={formatCents(profile.paidOutCents)} />
        <Stat label="Available" value={formatCents(owed)} accent />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Bank account</CardTitle>
        </CardHeader>
        <CardContent>
          <PayoutPanel
            stripeEnabled={isStripeEnabled()}
            onboarded={!!profile.stripeAccountId}
            payoutsEnabled={profile.payoutsEnabled}
            owedCents={owed}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {payouts.length === 0 && (
            <p className="text-sm text-muted-foreground">No payouts yet.</p>
          )}
          {payouts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0"
            >
              <div>
                <div className="font-mono-num">{formatCents(p.amountCents)}</div>
                <div className="text-xs text-muted-foreground">
                  {timeAgo(p.createdAt)}
                  {p.failureReason ? ` · ${p.failureReason}` : ""}
                </div>
              </div>
              <Badge
                variant={
                  p.status === "PAID" ? "emerald" : p.status === "FAILED" ? "crimson" : "secondary"
                }
              >
                {p.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div
          className={
            accent
              ? "font-mono-num text-xl font-semibold text-emerald-bright"
              : "font-mono-num text-xl font-semibold"
          }
        >
          {value}
        </div>
        <div className="text-xs tracking-wide text-muted-foreground uppercase">{label}</div>
      </CardContent>
    </Card>
  );
}
