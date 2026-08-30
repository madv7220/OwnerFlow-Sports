import Stripe from "stripe";

/**
 * Stripe is optional. With no key configured the app falls back to the demo
 * wallet so the project still runs end to end for anyone without credentials —
 * every call site checks `isStripeEnabled()` before reaching for `stripe()`.
 */
export function isStripeEnabled() {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  client ??= new Stripe(key, { typescript: true });
  return client;
}

/** Share of every sale kept by OwnerFlow; the rest goes to the handicapper. */
export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 20);

export function platformFeeCents(amountCents: number) {
  return Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
}

export function handicapperShareCents(amountCents: number) {
  return amountCents - platformFeeCents(amountCents);
}

export function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  );
}

const INTERVAL_MAP = {
  WEEKLY: { interval: "week" as const, interval_count: 1 },
  MONTHLY: { interval: "month" as const, interval_count: 1 },
  SEASON: { interval: "month" as const, interval_count: 6 },
};

export function recurringFor(interval: keyof typeof INTERVAL_MAP) {
  return INTERVAL_MAP[interval];
}
