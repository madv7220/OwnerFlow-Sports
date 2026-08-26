import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  title: z.string().min(3).max(80),
  scheduledFor: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "HANDICAPPER") {
    return NextResponse.json({ error: "Handicapper account required" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const profile = await prisma.handicapperProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No handicapper profile" }, { status: 404 });

  const stream = await prisma.stream.create({
    data: {
      handicapperId: profile.id,
      title: data.title,
      scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
    },
  });

  return NextResponse.json({ ok: true, stream });
}
