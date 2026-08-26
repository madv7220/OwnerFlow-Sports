import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLATFORM_TAKE_RATE = 0.2; // OwnerFlow keeps 20%, handicapper keeps 80%

const bodySchema = z
  .object({
    pickId: z.string().optional(),
    parlayId: z.string().optional(),
  })
  .refine((v) => !!v.pickId !== !!v.parlayId, {
    message: "Provide exactly one of pickId or parlayId",
  });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { pickId, parlayId } = parsed.data;
  const userId = session.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const content = pickId
        ? await tx.pick.findUniqueOrThrow({ where: { id: pickId } })
        : await tx.parlay.findUniqueOrThrow({ where: { id: parlayId! } });

      if (!content.priceCents) {
        throw new Error("This content is not available for individual purchase");
      }

      const existing = pickId
        ? await tx.purchase.findUnique({ where: { userId_pickId: { userId, pickId } } })
        : await tx.purchase.findUnique({ where: { userId_parlayId: { userId, parlayId: parlayId! } } });
      if (existing) throw new Error("Already unlocked");

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.walletBalance < content.priceCents) {
        throw new Error("Insufficient wallet balance. Add funds to continue.");
      }

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: content.priceCents } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          type: pickId ? "PICK_PURCHASE" : "PARLAY_PURCHASE",
          amountCents: -content.priceCents,
          description: pickId ? "Pick unlock" : "Parlay unlock",
        },
      });

      await tx.purchase.create({
        data: {
          userId,
          pickId: pickId ?? null,
          parlayId: parlayId ?? null,
          priceCents: content.priceCents,
        },
      });

      const handicapperEarning = Math.round(content.priceCents * (1 - PLATFORM_TAKE_RATE));
      await tx.handicapperProfile.update({
        where: { id: content.handicapperId },
        data: { earningsCents: { increment: handicapperEarning } },
      });

      const updatedUser = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      return { walletBalance: updatedUser.walletBalance };
    });

    return NextResponse.json({ ok: true, walletBalance: result.walletBalance });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Purchase failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
