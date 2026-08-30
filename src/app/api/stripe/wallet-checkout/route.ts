import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { appUrl, isStripeEnabled, stripe } from "@/lib/stripe";
import { getOrCreateCustomer } from "@/lib/stripe-sync";

const bodySchema = z.object({
  amountCents: z.number().int().min(500).max(100000),
});

/**
 * Funds a member's wallet with a real card payment. The wallet is only
 * credited by the `checkout.session.completed` webhook — never on the client
 * redirect, which a user can forge by visiting the success URL directly.
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
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const { amountCents } = parsed.data;
  const userId = session.user.id;

  const customerId = await getOrCreateCustomer(userId);

  const checkout = await stripe().checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: "OwnerFlow wallet credit",
            description: "Balance for unlocking picks and parlays",
          },
        },
        quantity: 1,
      },
    ],
    // Read back by the webhook to credit the right wallet.
    metadata: { kind: "wallet_topup", userId, amountCents: String(amountCents) },
    success_url: `${appUrl()}/account/wallet?funded=1`,
    cancel_url: `${appUrl()}/account/wallet?canceled=1`,
  });

  return NextResponse.json({ ok: true, url: checkout.url });
}
