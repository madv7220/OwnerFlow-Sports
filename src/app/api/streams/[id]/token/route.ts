import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStreamToken, isLiveKitEnabled } from "@/lib/livekit";

/**
 * Issues a LiveKit token for a stream room. The stream's owner gets publish
 * rights; everyone else is subscribe-only.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isLiveKitEnabled()) {
    return NextResponse.json({ error: "Live video is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const stream = await prisma.stream.findUnique({
    where: { id },
    include: { handicapper: { select: { userId: true } } },
  });
  if (!stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  const isOwner = stream.handicapper.userId === session.user.id;
  if (!isOwner && stream.status !== "LIVE") {
    return NextResponse.json({ error: "This stream is not live" }, { status: 400 });
  }

  const token = await createStreamToken({
    streamId: id,
    identity: session.user.id,
    name: session.user.name ?? session.user.username,
    canPublish: isOwner,
  });

  return NextResponse.json({
    ok: true,
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    canPublish: isOwner,
  });
}
