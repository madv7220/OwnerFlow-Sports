"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Game = { id: string; sport: string; homeTeam: string; awayTeam: string; startTime: string };
type Tier = { id: string; name: string };

const BET_TYPES = ["SPREAD", "MONEYLINE", "TOTAL", "PROP"];

export function PickForm({ games, tiers }: { games: Game[]; tiers: Tier[] }) {
  const router = useRouter();
  const [gate, setGate] = React.useState<"FREE" | "TIER" | "PRICE">("TIER");
  const [tierId, setTierId] = React.useState(tiers[0]?.id ?? "");
  const [betType, setBetType] = React.useState("SPREAD");
  const [gameId, setGameId] = React.useState(games[0]?.id ?? "");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);

    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        betType,
        selection: form.get("selection"),
        odds: form.get("odds"),
        unitsRisked: form.get("unitsRisked"),
        confidence: form.get("confidence"),
        analysis: form.get("analysis"),
        gate,
        tierId: gate === "TIER" ? tierId : undefined,
        priceCents: gate === "PRICE" ? Math.round(Number(form.get("price")) * 100) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error ?? "Could not publish pick");
      return;
    }
    toast.success("Pick published.");
    router.push("/studio");
    router.refresh();
  }

  if (games.length === 0) {
    return <p className="text-muted-foreground">No games available to attach a pick to right now.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label>Game</Label>
        <Select value={gameId} onValueChange={setGameId}>
          <SelectTrigger>
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
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Bet type</Label>
          <Select value={betType} onValueChange={setBetType}>
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
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="odds">Odds (American)</Label>
          <Input id="odds" name="odds" type="number" required placeholder="-110" defaultValue={-110} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="selection">Selection</Label>
        <Input id="selection" name="selection" required placeholder="e.g. Chiefs -3.5" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unitsRisked">Units risked</Label>
          <Input id="unitsRisked" name="unitsRisked" type="number" step="0.5" min="0.5" max="10" defaultValue={1} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confidence">Confidence (1-5)</Label>
          <Input id="confidence" name="confidence" type="number" min="1" max="5" defaultValue={3} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="analysis">Analysis</Label>
        <Textarea
          id="analysis"
          name="analysis"
          required
          minLength={10}
          rows={5}
          placeholder="Explain the read — line movement, matchup edge, injuries, situational spot…"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Access</Label>
        <Tabs value={gate} onValueChange={(v) => setGate(v as typeof gate)}>
          <TabsList className="w-full">
            <TabsTrigger value="FREE">Free</TabsTrigger>
            <TabsTrigger value="TIER">Tier-gated</TabsTrigger>
            <TabsTrigger value="PRICE">Pay-per-pick</TabsTrigger>
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
            <Input name="price" type="number" step="0.01" min="0.99" max="99.99" defaultValue="4.99" required />
          </div>
        )}
      </div>

      <Button type="submit" size="lg" disabled={loading} className="mt-2 self-start">
        {loading && <Loader2 className="animate-spin" />}
        Publish pick
      </Button>
    </form>
  );
}
