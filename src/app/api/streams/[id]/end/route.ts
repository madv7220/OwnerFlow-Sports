import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;

  const stream = await prisma.stream.findUnique({ where: { id }, include: { handicapper: true } });
  if (!stream || stream.handicapper.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.stream.update({
    where: { id },
    data: { status: "ENDED", endedAt: new Date() },
  });

  return NextResponse.json({ ok: true, stream: updated });
}
