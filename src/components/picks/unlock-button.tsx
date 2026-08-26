"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/utils";

export function UnlockButton({
  kind,
  id,
  priceCents,
}: {
  kind: "pick" | "parlay";
  id: string;
  priceCents: number;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(kind === "pick" ? { pickId: id } : { parlayId: id }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Could not complete purchase.");
      return;
    }
    toast.success(`Unlocked. New balance: ${formatCents(data.walletBalance)}`);
    router.refresh();
  }

  return (
    <Button onClick={onClick} disabled={loading} size="sm" className="gap-1.5">
      {loading ? <Loader2 className="animate-spin" /> : <Lock className="size-3.5" />}
      Unlock for {formatCents(priceCents)}
    </Button>
  );
}
