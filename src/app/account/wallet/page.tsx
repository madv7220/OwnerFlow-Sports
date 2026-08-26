import { redirect } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepositButtons } from "@/components/account/deposit-buttons";
import { cn, formatCents, timeAgo } from "@/lib/utils";

export const metadata = { title: "Wallet — OwnerFlow Sports" };

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/wallet");

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl mb-8">Wallet</h1>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Balance</span>
          <span className="font-mono-num text-4xl font-semibold text-emerald-bright">
            {formatCents(user.walletBalance)}
          </span>
          <Badge variant="secondary" className="mt-1">
            Demo credit — no real payment processed
          </Badge>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Add funds</CardTitle>
        </CardHeader>
        <CardContent>
          <DepositButtons />
          <p className="mt-3 text-xs text-muted-foreground">
            In production this connects to Stripe Checkout for real card payments — see the
            architecture doc for the integration plan.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction history</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {transactions.length === 0 && (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border/60 py-2 text-sm last:border-0">
              <div className="flex items-center gap-2">
                {t.amountCents >= 0 ? (
                  <ArrowDownLeft className="size-3.5 text-emerald-bright" />
                ) : (
                  <ArrowUpRight className="size-3.5 text-crimson" />
                )}
                <div>
                  <div>{t.description}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(t.createdAt)}</div>
                </div>
              </div>
              <span
                className={cn(
                  "font-mono-num font-medium",
                  t.amountCents >= 0 ? "text-emerald-bright" : "text-muted-foreground",
                )}
              >
                {t.amountCents >= 0 ? "+" : ""}
                {formatCents(t.amountCents)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
