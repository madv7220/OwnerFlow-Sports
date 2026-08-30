import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { handicapperShareCents, isStripeEnabled, stripe } from "@/lib/stripe";

/**
 * Stripe webhook receiver. This is the only thing that grants paid access:
 * the client redirect after Checkout is never trusted, because a user can
 * navigate to the success URL without paying.
 *
 * Every event id is recorded before it takes effect, so Stripe's at-least-once
 * delivery can't double-credit a wallet or double-extend a subscription.
 */

// The signature is computed over the raw body, so it must not be parsed first.
export const runtime = "nodejs";

function periodEnd(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const seconds =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return seconds ? new Date(seconds * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
}

async function creditWallet(userId: string, amountCents: number, description: string) {
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletBalance: { increment: amountCents } },
    }),
    prisma.walletTransaction.create({
      data: { userId, type: "DEPOSIT", amountCents, description },
    }),
  ]);
}

/**
 * Records access for a paid subscription period.
 *
 * `creditEarnings` is deliberately only set from `invoice.paid`. Stripe fires
 * BOTH `checkout.session.completed` and `invoice.paid` for a new subscription,
 * so crediting in both would pay the handicapper twice for one charge; billing
 * every period through `invoice.paid` covers the first payment and renewals
 * with exactly one credit each.
 */
async function upsertSubscription(params: {
  userId: string;
  tierId: string;
  stripeSubscriptionId: string;
  currentPeriodEnd: Date;
  status: "ACTIVE" | "CANCELED" | "EXPIRED";
  creditEarnings?: boolean;
  settledDirectlyToConnect?: boolean;
}) {
  const {
    userId,
    tierId,
    stripeSubscriptionId,
    currentPeriodEnd,
    status,
    creditEarnings = false,
    settledDirectlyToConnect = false,
  } = params;

  await prisma.subscription.upsert({
    where: { userId_tierId: { userId, tierId } },
    create: { userId, tierId, stripeSubscriptionId, currentPeriodEnd, status },
    update: { stripeSubscriptionId, currentPeriodEnd, status, autoRenew: status === "ACTIVE" },
  });

  // When the charge carried transfer_data, Stripe already moved the
  // handicapper's share to their connected account — crediting the internal
  // ledger too would let them withdraw the same money a second time.
  if (!creditEarnings || status !== "ACTIVE" || settledDirectlyToConnect) return;

  const tier = await prisma.membershipTier.findUnique({ where: { id: tierId } });
  if (tier?.handicapperId) {
    await prisma.handicapperProfile.update({
      where: { id: tier.handicapperId },
      data: { earningsCents: { increment: handicapperShareCents(tier.priceCents) } },
    });
  }
}

export async function POST(req: Request) {
  if (!isStripeEnabled() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhooks are not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Signature verification failed: ${message}` }, { status: 400 });
  }

  // Claim the event id first; a duplicate delivery short-circuits here.
  try {
    await prisma.processedWebhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.payment_status !== "paid" && s.mode !== "subscription") break;

        if (s.metadata?.kind === "wallet_topup" && s.metadata.userId) {
          const amount = s.amount_total ?? Number(s.metadata.amountCents ?? 0);
          if (amount > 0) {
            await creditWallet(s.metadata.userId, amount, "Wallet top-up (card)");
          }
        }

        if (s.mode === "subscription" && s.metadata?.userId && s.metadata?.tierId) {
          const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
          if (subId) {
            const sub = await stripe().subscriptions.retrieve(subId);
            // Access only — `invoice.paid` is what credits the handicapper.
            await upsertSubscription({
              userId: s.metadata.userId,
              tierId: s.metadata.tierId,
              stripeSubscriptionId: subId,
              currentPeriodEnd: periodEnd(sub),
              status: "ACTIVE",
            });
          }
        }
        break;
      }

      // Renewals: keep the access window in step with what Stripe has billed.
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subId =
          typeof invoice.subscription === "string" ? invoice.subscription : undefined;
        if (!subId) break;
        const sub = await stripe().subscriptions.retrieve(subId);
        const tierId = sub.metadata?.tierId;
        const userId = sub.metadata?.userId;
        if (tierId && userId) {
          await upsertSubscription({
            userId,
            tierId,
            stripeSubscriptionId: subId,
            currentPeriodEnd: periodEnd(sub),
            status: "ACTIVE",
            creditEarnings: true,
            // Connect already routed their cut on this charge.
            settledDirectlyToConnect: !!sub.transfer_data?.destination,
          });
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const ended = event.type === "customer.subscription.deleted" || sub.status !== "active";
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status: ended ? "CANCELED" : "ACTIVE",
            autoRenew: !ended && !sub.cancel_at_period_end,
            currentPeriodEnd: periodEnd(sub),
          },
        });
        break;
      }

      // Connect onboarding finished (or capabilities changed).
      case "account.updated": {
        const account = event.data.object;
        await prisma.handicapperProfile.updateMany({
          where: { stripeAccountId: account.id },
          data: { payoutsEnabled: !!account.charges_enabled && !!account.payouts_enabled },
        });
        break;
      }

      case "transfer.created":
      case "transfer.reversed": {
        const transfer = event.data.object as Stripe.Transfer;
        await prisma.payout.updateMany({
          where: { stripeTransferId: transfer.id },
          data: { status: event.type === "transfer.created" ? "PAID" : "FAILED" },
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Roll back the dedupe claim so Stripe's retry can have another go.
    await prisma.processedWebhookEvent.delete({ where: { id: event.id } }).catch(() => {});
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
