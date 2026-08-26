"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CancelSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    setLoading(true);
    const res = await fetch(`/api/subscriptions/${subscriptionId}/cancel`, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not cancel subscription");
      return;
    }
    toast.success("Subscription canceled");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon" className="size-7" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
      <span className="sr-only">Cancel subscription</span>
    </Button>
  );
}
