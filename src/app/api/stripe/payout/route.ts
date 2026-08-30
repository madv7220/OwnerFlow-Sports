import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeEnabled, stripe } from "@/lib/stripe";

/**
 * Pays a handicapper their unpaid earnings via a Stripe Connect transfer.
 *
 * `earningsCents - paidOutCents` is the balance owed. The Payout row is created
 * inside a transaction that also moves `paidOutCents` *before* the transfer is
 * requested, so two concurrent clicks can't pay the same balance twice; if the
 * transfer then fails the row is marked FAILED and the amount is returned.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "HANDICAPPER") {
    return NextResponse.json({ error: "Handicapper account required" }, { status: 403 });
  }
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const profile = await prisma.handicapperProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "No handicapper profile" }, { status: 404 });
  }
  if (!profile.stripeAccountId || !profile.payoutsEnabled) {
    return NextResponse.json(
      { error: "Finish Stripe onboarding before requesting a payout" },
      { status: 400 },
    );
  }

  const owed = profile.earningsCents - profile.paidOutCents;
  if (owed < 1000) {
    return NextResponse.json(
      { error: "Minimum payout is $10.00" },
      { status: 400 },
    );
  }

  // Reserve the balance first so a double-submit can't transfer it twice.
  const payout = await prisma.$transaction(async (tx) => {
    const fresh = await tx.handicapperProfile.findUniqueOrThrow({ where: { id: profile.id } });
    const amount = fresh.earningsCents - fresh.paidOutCents;
    if (amount < 1000) throw new Error("Minimum payout is $10.00");

    await tx.handicapperProfile.update({
      where: { id: fresh.id },
      data: { paidOutCents: { increment: amount } },
    });
    return tx.payout.create({
      data: { handicapperId: fresh.id, amountCents: amount, status: "PENDING" },
    });
  });

  try {
    const transfer = await stripe().transfers.create(
      {
        amount: payout.amountCents,
        currency: "usd",
        destination: profile.stripeAccountId,
        metadata: { payoutId: payout.id, handicapperId: profile.id },
      },
      // Stripe dedupes on this key, so a retry can't send the money twice.
      { idempotencyKey: `payout_${payout.id}` },
    );

    await prisma.payout.update({
      where: { id: payout.id },
      data: { status: "PAID", stripeTransferId: transfer.id },
    });

    return NextResponse.json({ ok: true, amountCents: payout.amountCents, transferId: transfer.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transfer failed";
    // Hand the reserved balance back so it can be paid out later.
    await prisma.$transaction([
      prisma.handicapperProfile.update({
        where: { id: profile.id },
        data: { paidOutCents: { decrement: payout.amountCents } },
      }),
      prisma.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED", failureReason: message.slice(0, 300) },
      }),
    ]);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
