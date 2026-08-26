"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewStreamForm() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await fetch("/api/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        scheduledFor: form.get("scheduledFor") || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create stream");
      return;
    }
    toast.success("Stream created. You can go live whenever you're ready.");
    router.push(`/live/${data.stream.id}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Stream title</Label>
        <Input id="title" name="title" required placeholder="Sunday Slate Live Breakdown" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="scheduledFor">Scheduled for (optional)</Label>
        <Input id="scheduledFor" name="scheduledFor" type="datetime-local" />
      </div>
      <Button type="submit" disabled={loading} className="self-start">
        {loading && <Loader2 className="animate-spin" />}
        Create stream
      </Button>
    </form>
  );
}
