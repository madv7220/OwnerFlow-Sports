import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const userId = session.user.id;

  const existing = await prisma.feedLike.findUnique({
    where: { postId_userId: { postId: id, userId } },
  });

  if (existing) {
    await prisma.feedLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.feedLike.create({ data: { postId: id, userId } });
  }

  const likeCount = await prisma.feedLike.count({ where: { postId: id } });
  return NextResponse.json({ ok: true, liked: !existing, likeCount });
}
