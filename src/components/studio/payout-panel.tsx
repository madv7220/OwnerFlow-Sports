"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BanknoteArrowUp, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";

export function PayoutPanel({
  stripeEnabled,
  onboarded,
  payoutsEnabled,
  owedCents,
}: {
  stripeEnabled: boolean;
  onboarded: boolean;
  payoutsEnabled: boolean;
  owedCents: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<"onboard" | "payout" | null>(null);

  async function startOnboarding() {
    setLoading("onboard");
    const res = await fetch("/api/stripe/connect/onboard", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      setLoading(null);
      toast.error(data.error ?? "Could not start onboarding");
      return;
    }
    window.location.assign(data.url);
  }

  async function requestPayout() {
    setLoading("payout");
    const res = await fetch("/api/stripe/payout", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      toast.error(data.error ?? "Payout failed");
      return;
    }
    toast.success(`${formatCents(data.amountCents)} sent to your bank account.`);
    router.refresh();
  }

  if (!stripeEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        Payouts are unavailable because Stripe isn&apos;t configured on this deployment. Set{" "}
        <code className="text-xs text-gold-bright">STRIPE_SECRET_KEY</code> to enable them.
      </p>
    );
  }

  if (!payoutsEnabled) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          {onboarded
            ? "Stripe still needs a few details before it can pay you. Pick up where you left off."
            : "Connect a bank account through Stripe to receive your share of every sale."}
        </p>
        <Button onClick={startOnboarding} disabled={loading !== null} className="gap-1.5">
          {loading === "onboard" ? <Loader2 className="animate-spin" /> : <ExternalLink className="size-3.5" />}
          {onboarded ? "Finish Stripe onboarding" : "Set up payouts with Stripe"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <div>
        <div className="font-mono-num text-2xl font-semibold text-emerald-bright">
          {formatCents(owedCents)}
        </div>
        <div className="text-xs tracking-wide text-muted-foreground uppercase">Available to withdraw</div>
      </div>
      <Button
        onClick={requestPayout}
        disabled={loading !== null || owedCents < 1000}
        className="gap-1.5"
      >
        {loading === "payout" ? <Loader2 className="animate-spin" /> : <BanknoteArrowUp className="size-3.5" />}
        Withdraw to bank
      </Button>
      {owedCents < 1000 && (
        <p className="text-xs text-muted-foreground">Minimum withdrawal is $10.00.</p>
      )}
    </div>
  );
}
