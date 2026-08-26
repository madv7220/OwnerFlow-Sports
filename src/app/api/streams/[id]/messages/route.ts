import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const after = searchParams.get("after");

  const messages = await prisma.streamMessage.findMany({
    where: { streamId: id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    include: { user: { select: { name: true, username: true } } },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({ messages });
}

const bodySchema = z.object({ body: z.string().min(1).max(300) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const stream = await prisma.stream.findUnique({ where: { id } });
  if (!stream || stream.status !== "LIVE") {
    return NextResponse.json({ error: "This stream is not live" }, { status: 400 });
  }

  const message = await prisma.streamMessage.create({
    data: { streamId: id, userId: session.user.id, body: parsed.data.body },
    include: { user: { select: { name: true, username: true } } },
  });

  return NextResponse.json({ ok: true, message });
}
