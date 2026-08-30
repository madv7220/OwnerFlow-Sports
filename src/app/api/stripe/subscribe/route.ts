import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, isStripeEnabled, PLATFORM_FEE_PERCENT, stripe } from "@/lib/stripe";
import { connectDestinationFor, getOrCreateCustomer, getOrCreateTierPrice } from "@/lib/stripe-sync";

const bodySchema = z.object({ tierId: z.string() });

/**
 * Real recurring billing for a membership tier. When the handicapper has
 * finished Connect onboarding the subscription is billed on their behalf and
 * OwnerFlow keeps only its application fee; otherwise the charge stays on the
 * platform and their share accrues for a manual payout.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { tierId } = parsed.data;
  const userId = session.user.id;

  const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
  if (!tier) return NextResponse.json({ error: "Tier not found" }, { status: 404 });

  const existing = await prisma.subscription.findUnique({
    where: { userId_tierId: { userId, tierId } },
  });
  if (existing?.status === "ACTIVE") {
    return NextResponse.json({ error: "Already subscribed to this tier" }, { status: 400 });
  }

  const [customerId, priceId] = await Promise.all([
    getOrCreateCustomer(userId),
    getOrCreateTierPrice(tierId),
  ]);

  const destination = tier.handicapperId
    ? await connectDestinationFor(tier.handicapperId)
    : null;

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: destination
      ? {
          application_fee_percent: PLATFORM_FEE_PERCENT,
          transfer_data: { destination },
          metadata: { tierId, userId },
        }
      : { metadata: { tierId, userId } },
    metadata: { kind: "subscription", userId, tierId },
    success_url: `${appUrl()}/dashboard?subscribed=1`,
    cancel_url: `${appUrl()}/pricing?canceled=1`,
  });

  return NextResponse.json({ ok: true, url: checkout.url });
}
