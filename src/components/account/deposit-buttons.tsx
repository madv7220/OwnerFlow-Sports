"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";

const AMOUNTS = [2500, 5000, 10000, 25000];

export function DepositButtons() {
  const router = useRouter();
  const [loading, setLoading] = React.useState<number | null>(null);

  async function deposit(amountCents: number) {
    setLoading(amountCents);
    const res = await fetch("/api/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountCents }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(null);
    if (!res.ok) {
      toast.error(data.error ?? "Could not add funds");
      return;
    }
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
          onClick={() => deposit(amount)}
        >
          {loading === amount && <Loader2 className="animate-spin" />}
          + {formatCents(amount)}
        </Button>
      ))}
    </div>
  );
}
