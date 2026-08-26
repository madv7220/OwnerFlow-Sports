import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLATFORM_TAKE_RATE = 0.2;

const bodySchema = z.object({ tierId: z.string() });

function periodEndFor(interval: string) {
  const days = interval === "WEEKLY" ? 7 : interval === "SEASON" ? 180 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const userId = session.user.id;
  const { tierId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tier = await tx.membershipTier.findUniqueOrThrow({ where: { id: tierId } });

      const existing = await tx.subscription.findUnique({
        where: { userId_tierId: { userId, tierId } },
      });
      if (existing && existing.status === "ACTIVE") {
        throw new Error("Already subscribed to this tier");
      }

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.walletBalance < tier.priceCents) {
        throw new Error("Insufficient wallet balance. Add funds to continue.");
      }

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: tier.priceCents } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: "SUBSCRIPTION",
          amountCents: -tier.priceCents,
          description: `Subscribed to ${tier.name}`,
        },
      });

      const subscription = existing
        ? await tx.subscription.update({
            where: { id: existing.id },
            data: { status: "ACTIVE", currentPeriodEnd: periodEndFor(tier.interval), autoRenew: true },
          })
        : await tx.subscription.create({
            data: { userId, tierId, currentPeriodEnd: periodEndFor(tier.interval) },
          });

      if (tier.handicapperId) {
        const handicapperEarning = Math.round(tier.priceCents * (1 - PLATFORM_TAKE_RATE));
        await tx.handicapperProfile.update({
          where: { id: tier.handicapperId },
          data: { earningsCents: { increment: handicapperEarning } },
        });
      }

      const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return { walletBalance: updatedUser.walletBalance, subscriptionId: subscription.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Subscription failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
