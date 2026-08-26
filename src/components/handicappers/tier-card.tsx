"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TierCard({
  id,
  name,
  priceCents,
  interval,
  description,
  perks,
  accentColor,
  isSubscribed,
  featured,
}: {
  id: string;
  name: string;
  priceCents: number;
  interval: string;
  description: string;
  perks: string[];
  accentColor: string;
  isSubscribed: boolean;
  featured?: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubscribe() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tierId: id }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not subscribe");
      return;
    }
    toast.success(`Subscribed to ${name}. New balance: ${formatCents(data.walletBalance)}`);
    router.refresh();
  }

  return (
    <Card
      className={cn("flex flex-col", featured && "border-gold/60 shadow-[0_0_30px_-12px_rgba(201,162,75,0.5)]")}
    >
      <CardHeader>
        <div
          className="mb-1 h-1 w-10 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
        <CardTitle>{name}</CardTitle>
        <div className="flex items-baseline gap-1">
          <span className="font-mono-num text-2xl font-semibold text-foreground">
            {formatCents(priceCents)}
          </span>
          <span className="text-xs text-muted-foreground">
            /{interval === "WEEKLY" ? "wk" : interval === "SEASON" ? "season" : "mo"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <ul className="flex flex-1 flex-col gap-2">
          {perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-bright" />
              {perk}
            </li>
          ))}
        </ul>
        <Button
          onClick={onSubscribe}
          disabled={loading || isSubscribed}
          variant={featured ? "default" : "outline"}
          className="w-full"
        >
          {loading && <Loader2 className="animate-spin" />}
          {isSubscribed ? "Subscribed" : "Subscribe"}
        </Button>
      </CardContent>
    </Card>
  );
}
