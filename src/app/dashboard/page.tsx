import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Lock, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { SportBadge } from "@/components/shared/sport-badge";
import { CancelSubscriptionButton } from "@/components/account/cancel-subscription-button";
import { formatCents, timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard — OwnerFlow Sports" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");
  const userId = session.user.id;

  const [user, purchases, subscriptions, follows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.purchase.findMany({
      where: { userId },
      include: {
        pick: { include: { game: true, handicapper: true } },
        parlay: { include: { handicapper: true } },
      },
      orderBy: { purchasedAt: "desc" },
      take: 10,
    }),
    prisma.subscription.findMany({
      where: { userId, status: "ACTIVE" },
      include: { tier: { include: { handicapper: true } } },
    }),
    prisma.follow.findMany({
      where: { userId },
      include: { handicapper: { include: { user: { select: { username: true } } } } },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">My Desk</p>
          <h1 className="font-display text-3xl">Welcome back, {user.name.split(" ")[0]}</h1>
        </div>
        <Card className="w-fit">
          <CardContent className="flex items-center gap-3 px-4 py-3">
            <Wallet className="size-5 text-gold" />
            <div>
              <div className="font-mono-num text-lg font-semibold text-emerald-bright">
                {formatCents(user.walletBalance)}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">Wallet balance</div>
            </div>
            <Button asChild size="sm" variant="outline" className="ml-2">
              <Link href="/account/wallet">Manage</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="font-display text-xl mb-4">Unlocked picks &amp; parlays</h2>
            {purchases.length === 0 ? (
              <EmptyCard label="You haven't unlocked any picks yet." href="/picks" cta="Browse the marketplace" />
            ) : (
              <div className="flex flex-col gap-2.5">
                {purchases.map((p) => {
                  const item = p.pick ?? p.parlay;
                  if (!item) return null;
                  const isPick = !!p.pick;
                  return (
                    <Card key={p.id}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="flex items-center gap-3">
                          {isPick && p.pick && <SportBadge sport={p.pick.sport} />}
                          <div>
                            <div className="text-sm font-medium">
                              {isPick && p.pick ? p.pick.selection : p.parlay?.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.handicapper.displayName} · {timeAgo(p.purchasedAt)} ·{" "}
                              {formatCents(p.priceCents)}
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={item.status} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active memberships</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active subscriptions.</p>
              ) : (
                subscriptions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{s.tier.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.tier.handicapper ? s.tier.handicapper.displayName : "OwnerFlow Platform"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock className="size-3.5 text-emerald-bright" />
                      <CancelSubscriptionButton subscriptionId={s.id} />
                    </div>
                  </div>
                ))
              )}
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href="/pricing">Browse memberships</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-base">
                <Heart className="size-4 text-crimson" /> Following
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {follows.length === 0 ? (
                <p className="text-sm text-muted-foreground">You&apos;re not following anyone yet.</p>
              ) : (
                follows.map((f) => (
                  <Link
                    key={f.id}
                    href={`/handicappers/${f.handicapper.user.username}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {f.handicapper.displayName
                          .split(" ")
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    {f.handicapper.displayName}
                  </Link>
                ))
              )}
              <Button asChild size="sm" variant="outline" className="mt-1">
                <Link href="/handicappers">Discover handicappers</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ label, href, cta }: { label: string; href: string; cta: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
        {label}
        <Button asChild size="sm">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
