import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { BroadcastControls } from "@/components/live/broadcast-controls";
import { ViewerStage } from "@/components/live/viewer-stage";
import { LiveKitStage } from "@/components/live/livekit-stage";
import { isLiveKitEnabled } from "@/lib/livekit";
import { StreamChat } from "@/components/live/stream-chat";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stream = await prisma.stream.findUnique({ where: { id }, select: { title: true } });
  return { title: `${stream?.title ?? "Live"} — OwnerFlow Sports` };
}

export default async function StreamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const stream = await prisma.stream.findUnique({
    where: { id },
    include: {
      handicapper: { include: { user: true } },
      messages: {
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!stream) notFound();

  const isOwner = session?.user?.id === stream.handicapper.userId;
  const liveKitEnabled = isLiveKitEnabled();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/handicappers/${stream.handicapper.user.username}`}
            className="text-sm text-gold-bright hover:underline"
          >
            {stream.handicapper.displayName}
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl">{stream.title}</h1>
        </div>
        {stream.status === "SCHEDULED" && stream.scheduledFor && (
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="size-3" />
            Starts {stream.scheduledFor.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          {isOwner ? (
            <BroadcastControls
              streamId={stream.id}
              status={stream.status}
              liveKitEnabled={liveKitEnabled}
              viewerCount={stream.viewerCount}
            />
          ) : liveKitEnabled && stream.status === "LIVE" && session?.user ? (
            <LiveKitStage
              streamId={stream.id}
              canPublishHint={false}
              viewerCount={stream.viewerCount}
              isLive
              emptyLabel={`${stream.handicapper.displayName} hasn't started their camera yet.`}
            />
          ) : (
            <ViewerStage
              displayName={stream.handicapper.displayName}
              status={stream.status}
              viewerCount={stream.viewerCount}
              needsSignIn={liveKitEnabled && stream.status === "LIVE" && !session?.user}
            />
          )}
        </div>
        <div className="h-[520px]">
          <StreamChat
            streamId={stream.id}
            isLive={stream.status === "LIVE"}
            initialMessages={stream.messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
              user: m.user,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
