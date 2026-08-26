import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ handicapperId: z.string() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { handicapperId } = parsed.data;
  const userId = session.user.id;

  const existing = await prisma.follow.findUnique({
    where: { userId_handicapperId: { userId, handicapperId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, following: false });
  }

  await prisma.follow.create({ data: { userId, handicapperId } });
  return NextResponse.json({ ok: true, following: true });
}
