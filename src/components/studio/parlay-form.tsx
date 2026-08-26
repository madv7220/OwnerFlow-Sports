"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { combineParlayOdds, formatOdds } from "@/lib/utils";

type Game = { id: string; sport: string; homeTeam: string; awayTeam: string };
type Tier = { id: string; name: string };

const BET_TYPES = ["SPREAD", "MONEYLINE", "TOTAL", "PROP"];

type Leg = { gameId: string; betType: string; selection: string; odds: number };

export function ParlayForm({ games, tiers }: { games: Game[]; tiers: Tier[] }) {
  const router = useRouter();
  const [gate, setGate] = React.useState<"FREE" | "TIER" | "PRICE">("TIER");
  const [tierId, setTierId] = React.useState(tiers[0]?.id ?? "");
  const [legs, setLegs] = React.useState<Leg[]>([
    { gameId: games[0]?.id ?? "", betType: "SPREAD", selection: "", odds: -110 },
    { gameId: games[1]?.id ?? games[0]?.id ?? "", betType: "SPREAD", selection: "", odds: -110 },
  ]);
  const [loading, setLoading] = React.useState(false);

  const combined = combineParlayOdds(legs.map((l) => l.odds || -110));

  function updateLeg(i: number, patch: Partial<Leg>) {
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLeg() {
    if (legs.length >= 8) return;
    setLegs((prev) => [...prev, { gameId: games[0]?.id ?? "", betType: "SPREAD", selection: "", odds: -110 }]);
  }
  function removeLeg(i: number) {
    if (legs.length <= 2) return;
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (legs.some((l) => !l.selection.trim())) {
      toast.error("Every leg needs a selection");
      return;
    }
    setLoading(true);

    const res = await fetch("/api/parlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        unitsRisked: form.get("unitsRisked"),
        analysis: form.get("analysis"),
        legs,
        gate,
        tierId: gate === "TIER" ? tierId : undefined,
        priceCents: gate === "PRICE" ? Math.round(Number(form.get("price")) * 100) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Could not publish parlay");
      return;
    }
    toast.success("Parlay published.");
    router.push("/studio");
    router.refresh();
  }

  if (games.length === 0) {
    return <p className="text-muted-foreground">No games available to build a parlay right now.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Parlay name</Label>
        <Input id="name" name="name" required placeholder="Sunday Slate 4-Leg" />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label>Legs</Label>
          <span className="font-mono-num text-sm text-gold-bright">Combined: {formatOdds(combined)}</span>
        </div>

        {legs.map((leg, i) => (
          <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-[1fr_auto]">
            <div className="grid grid-cols-2 gap-2">
              <Select value={leg.gameId} onValueChange={(v) => updateLeg(i, { gameId: v })}>
                <SelectTrigger className="col-span-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {games.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      [{g.sport}] {g.awayTeam} @ {g.homeTeam}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={leg.betType} onValueChange={(v) => updateLeg(i, { betType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BET_TYPES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={leg.odds}
                onChange={(e) => updateLeg(i, { odds: Number(e.target.value) })}
                type="number"
                placeholder="Odds"
              />
              <Input
                value={leg.selection}
                onChange={(e) => updateLeg(i, { selection: e.target.value })}
                placeholder="Selection, e.g. Lakers -4.5"
                className="col-span-2"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeLeg(i)}
              disabled={legs.length <= 2}
              className="justify-self-end sm:justify-self-auto"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addLeg} disabled={legs.length >= 8} className="gap-1.5 self-start">
          <Plus className="size-3.5" /> Add leg
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitsRisked">Units risked</Label>
          <Input id="unitsRisked" name="unitsRisked" type="number" step="0.5" min="0.5" max="10" defaultValue={1} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis">Analysis</Label>
        <Textarea id="analysis" name="analysis" required minLength={10} rows={5} placeholder="Why these legs correlate…" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Access</Label>
        <Tabs value={gate} onValueChange={(v) => setGate(v as typeof gate)}>
          <TabsList className="w-full">
            <TabsTrigger value="FREE">Free</TabsTrigger>
            <TabsTrigger value="TIER">Tier-gated</TabsTrigger>
            <TabsTrigger value="PRICE">Pay-per-parlay</TabsTrigger>
          </TabsList>
        </Tabs>
        {gate === "TIER" && (
          <Select value={tierId} onValueChange={setTierId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a tier" />
            </SelectTrigger>
            <SelectContent>
              {tiers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {gate === "PRICE" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">$</span>
            <Input name="price" type="number" step="0.01" min="0.99" max="99.99" defaultValue="9.99" required />
          </div>
        )}
      </div>

      <Button type="submit" size="lg" disabled={loading} className="mt-2 self-start">
        {loading && <Loader2 className="animate-spin" />}
        Publish parlay
      </Button>
    </form>
  );
}
