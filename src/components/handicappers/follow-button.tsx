"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FollowButton({
  handicapperId,
  initiallyFollowing,
}: {
  handicapperId: string;
  initiallyFollowing: boolean;
}) {
  const { status } = useSession();
  const router = useRouter();
  const [following, setFollowing] = React.useState(initiallyFollowing);
  const [loading, setLoading] = React.useState(false);

  async function onClick() {
    if (status !== "authenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handicapperId }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return;
    }
    setFollowing(data.following);
    toast.success(data.following ? "Following" : "Unfollowed");
    router.refresh();
  }

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      variant={following ? "secondary" : "outline"}
      size="sm"
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Heart className={cn("size-3.5", following && "fill-crimson text-crimson")} />
      )}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
