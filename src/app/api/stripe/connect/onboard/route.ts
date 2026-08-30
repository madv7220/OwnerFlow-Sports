import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { appUrl, isStripeEnabled, stripe } from "@/lib/stripe";

/**
 * Starts (or resumes) Stripe Connect onboarding for a handicapper. Returns a
 * one-time account link — Stripe hosts the identity/bank collection, so no
 * payout details ever touch this server.
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
    include: { user: { select: { email: true } } },
  });
  if (!profile) {
    return NextResponse.json({ error: "No handicapper profile" }, { status: 404 });
  }

  let accountId = profile.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      email: profile.user.email,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true },
      },
      metadata: { handicapperId: profile.id, userId: session.user.id },
    });
    accountId = account.id;
    await prisma.handicapperProfile.update({
      where: { id: profile.id },
      data: { stripeAccountId: accountId },
    });
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${appUrl()}/studio/payouts?refresh=1`,
    return_url: `${appUrl()}/studio/payouts?onboarded=1`,
  });

  return NextResponse.json({ ok: true, url: link.url });
}
