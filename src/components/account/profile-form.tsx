"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ProfileForm({ name, bio }: { name: string; bio: string }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.get("name"), bio: form.get("bio") }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Could not save changes");
      return;
    }
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" defaultValue={name} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" defaultValue={bio} rows={3} placeholder="Tell members about yourself" />
      </div>
      <Button type="submit" disabled={loading} className="self-start">
        {loading && <Loader2 className="animate-spin" />}
        Save changes
      </Button>
    </form>
  );
}
