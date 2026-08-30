"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";

const AMOUNTS = [2500, 5000, 10000, 25000];

export function DepositButtons({ stripeEnabled }: { stripeEnabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<number | null>(null);

  async function addFunds(amountCents: number) {
    setLoading(amountCents);

    // With Stripe configured this is a real card payment; the wallet is only
    // credited once Stripe's webhook confirms the charge.
    const endpoint = stripeEnabled ? "/api/stripe/wallet-checkout" : "/api/wallet/deposit";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(null);
      toast.error(data.error ?? "Could not add funds");
      return;
    }

    if (stripeEnabled && data.url) {
      window.location.assign(data.url);
      return;
    }

    setLoading(null);
    toast.success(`Added ${formatCents(amountCents)}. New balance: ${formatCents(data.walletBalance)}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {AMOUNTS.map((amount) => (
        <Button
          key={amount}
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => addFunds(amount)}
          className="gap-1.5"
        >
          {loading === amount ? (
            <Loader2 className="animate-spin" />
          ) : stripeEnabled ? (
            <CreditCard className="size-3.5" />
          ) : null}
          {formatCents(amount)}
        </Button>
      ))}
    </div>
  );
}
