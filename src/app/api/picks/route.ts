import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  gameId: z.string(),
  betType: z.enum(["SPREAD", "MONEYLINE", "TOTAL", "PROP"]),
  selection: z.string().min(2).max(80),
  odds: z.coerce.number().int().refine((n) => n !== 0),
  unitsRisked: z.coerce.number().min(0.5).max(10),
  confidence: z.coerce.number().int().min(1).max(5),
  analysis: z.string().min(10).max(2000),
  gate: z.enum(["FREE", "TIER", "PRICE"]),
  tierId: z.string().optional(),
  priceCents: z.coerce.number().int().min(99).max(9999).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "HANDICAPPER") {
    return NextResponse.json({ error: "Handicapper account required" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const profile = await prisma.handicapperProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No handicapper profile" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id: data.gameId } });
  if (!game) return NextResponse.json({ error: "Game not found" }, { status: 404 });

  if (data.gate === "TIER" && data.tierId) {
    const tier = await prisma.membershipTier.findUnique({ where: { id: data.tierId } });
    if (!tier || tier.handicapperId !== profile.id) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }
  }

  const pick = await prisma.pick.create({
    data: {
      handicapperId: profile.id,
      gameId: data.gameId,
      sport: game.sport,
      betType: data.betType,
      selection: data.selection,
      odds: data.odds,
      unitsRisked: data.unitsRisked,
      confidence: data.confidence,
      analysis: data.analysis,
      isFree: data.gate === "FREE",
      tierId: data.gate === "TIER" ? data.tierId ?? null : null,
      priceCents: data.gate === "PRICE" ? data.priceCents ?? null : null,
    },
  });

  return NextResponse.json({ ok: true, pick });
}
