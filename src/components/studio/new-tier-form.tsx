"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewTierForm() {
  const router = useRouter();
  const [interval, setInterval] = React.useState("MONTHLY");
  const [perks, setPerks] = React.useState<string[]>(["Full pick access"]);
  const [loading, setLoading] = React.useState(false);

  function updatePerk(i: number, value: string) {
    setPerks((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }
  function addPerk() {
    if (perks.length >= 6) return;
    setPerks((prev) => [...prev, ""]);
  }
  function removePerk(i: number) {
    setPerks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const cleanPerks = perks.map((p) => p.trim()).filter(Boolean);
    if (cleanPerks.length === 0) {
      toast.error("Add at least one perk");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/tiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        priceCents: Math.round(Number(form.get("price")) * 100),
        interval,
        description: form.get("description"),
        perks: cleanPerks,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create tier");
      return;
    }
    toast.success("Tier created.");
    router.refresh();
    (document.getElementById("new-tier-form") as HTMLFormElement | null)?.reset();
    setPerks(["Full pick access"]);
  }

  return (
    <form id="new-tier-form" onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Tier name</Label>
          <Input id="name" name="name" required placeholder="Elite" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price (USD)</Label>
          <Input id="price" name="price" type="number" step="0.01" min="2.99" required placeholder="49.00" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Billing interval</Label>
        <Select value={interval} onValueChange={setInterval}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="WEEKLY">Weekly</SelectItem>
            <SelectItem value="MONTHLY">Monthly</SelectItem>
            <SelectItem value="SEASON">Season</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" required rows={2} placeholder="What members get with this tier" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Perks</Label>
        {perks.map((perk, i) => (
          <div key={i} className="flex gap-2">
            <Input value={perk} onChange={(e) => updatePerk(i, e.target.value)} placeholder="e.g. 5 picks/week" />
            <Button type="button" variant="ghost" size="icon" onClick={() => removePerk(i)} disabled={perks.length <= 1}>
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addPerk} disabled={perks.length >= 6} className="gap-1.5 self-start">
          <Plus className="size-3.5" /> Add perk
        </Button>
      </div>
      <Button type="submit" disabled={loading} className="self-start">
        {loading && <Loader2 className="animate-spin" />}
        Create tier
      </Button>
    </form>
  );
}
