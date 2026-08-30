"use client";

import * as React from "react";
import {
  isTrackReference,
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, VideoOff } from "lucide-react";
import "@livekit/components-styles";
import { Badge } from "@/components/ui/badge";
import { Radio, Users } from "lucide-react";

type TokenResponse = { token: string; url: string; canPublish: boolean };

/** Renders whatever camera/screen tracks are live in the room. */
function Stage({ emptyLabel }: { emptyLabel: string }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  // Placeholders represent participants with no live track yet — drop them so
  // the room shows the empty state instead of a black tile.
  const publishing = tracks.filter(isTrackReference).filter((t) => t.publication.track);

  if (publishing.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <VideoOff className="size-8" />
        <p className="text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-1 gap-1">
      {publishing.map((t) => (
        <VideoTrack
          key={t.publication.trackSid}
          trackRef={t}
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  );
}

export function LiveKitStage({
  streamId,
  canPublishHint,
  viewerCount,
  isLive,
  emptyLabel,
}: {
  streamId: string;
  canPublishHint: boolean;
  viewerCount: number;
  isLive: boolean;
  emptyLabel: string;
}) {
  const [auth, setAuth] = React.useState<TokenResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/streams/${streamId}/token`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Could not join the room");
        return;
      }
      setAuth(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [streamId]);

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-black text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (!auth) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-lg border border-border bg-black">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-black">
      <LiveKitRoom
        token={auth.token}
        serverUrl={auth.url}
        connect
        // The broadcaster publishes camera + mic; viewers join subscribe-only.
        video={auth.canPublish && canPublishHint}
        audio={auth.canPublish && canPublishHint}
        className="h-full w-full"
      >
        <Stage emptyLabel={emptyLabel} />
        <RoomAudioRenderer />
      </LiveKitRoom>

      {isLive && (
        <>
          <Badge variant="live" className="absolute top-4 left-4 gap-1">
            <Radio className="size-3" /> LIVE
          </Badge>
          <Badge variant="secondary" className="absolute top-4 right-4 gap-1">
            <Users className="size-3" /> {viewerCount}
          </Badge>
        </>
      )}
    </div>
  );
}
