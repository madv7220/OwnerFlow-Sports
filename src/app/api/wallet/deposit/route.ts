import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Demo wallet top-up. In production this route is replaced by a Stripe
// Checkout session + webhook confirmation — see docs/ARCHITECTURE.md.
const bodySchema = z.object({ amountCents: z.number().int().positive().max(100000) });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  const { amountCents } = parsed.data;
  const userId = session.user.id;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: amountCents } },
  });

  await prisma.walletTransaction.create({
    data: { userId, type: "DEPOSIT", amountCents, description: "Demo wallet top-up" },
  });

  return NextResponse.json({ ok: true, walletBalance: user.walletBalance });
}
