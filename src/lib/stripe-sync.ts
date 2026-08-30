import { prisma } from "@/lib/prisma";
import { recurringFor, stripe } from "@/lib/stripe";

/**
 * Stripe objects are created lazily and their ids cached on our rows, so a
 * customer/product/price is only ever created once per user or tier.
 */

export async function getOrCreateCustomer(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe().customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id, username: user.username },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function getOrCreateTierPrice(tierId: string) {
  const tier = await prisma.membershipTier.findUniqueOrThrow({ where: { id: tierId } });
  if (tier.stripePriceId) return tier.stripePriceId;

  const productId =
    tier.stripeProductId ??
    (
      await stripe().products.create({
        name: tier.name,
        description: tier.description,
        metadata: { tierId: tier.id },
      })
    ).id;

  const price = await stripe().prices.create({
    product: productId,
    currency: "usd",
    unit_amount: tier.priceCents,
    recurring: recurringFor(tier.interval),
    metadata: { tierId: tier.id },
  });

  await prisma.membershipTier.update({
    where: { id: tier.id },
    data: { stripeProductId: productId, stripePriceId: price.id },
  });

  return price.id;
}

/**
 * A handicapper is paid through their own Connect account. Returns null when
 * they haven't finished onboarding, in which case the sale still completes and
 * their share accrues to `earningsCents` for a later payout.
 */
export async function connectDestinationFor(handicapperId: string) {
  const profile = await prisma.handicapperProfile.findUnique({
    where: { id: handicapperId },
    select: { stripeAccountId: true, payoutsEnabled: true },
  });
  if (!profile?.stripeAccountId || !profile.payoutsEnabled) return null;
  return profile.stripeAccountId;
}
