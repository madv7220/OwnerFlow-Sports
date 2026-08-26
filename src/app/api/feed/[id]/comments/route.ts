import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ body: z.string().min(1).max(500) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const comment = await prisma.feedComment.create({
    data: { postId: id, userId: session.user.id, body: parsed.data.body },
    include: { user: { select: { name: true, username: true } } },
  });

  return NextResponse.json({ ok: true, comment });
}
