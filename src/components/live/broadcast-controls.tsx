"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Radio, Square, Video, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveKitStage } from "@/components/live/livekit-stage";

export function BroadcastControls({
  streamId,
  status,
  liveKitEnabled,
  viewerCount,
}: {
  streamId: string;
  status: string;
  liveKitEnabled: boolean;
  viewerCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [cameraOn, setCameraOn] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const isLive = status === "LIVE";

  React.useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setCameraOn(false);
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = media;
      if (videoRef.current) videoRef.current.srcObject = media;
      setCameraOn(true);
    } catch {
      toast.error("Camera access denied or unavailable on this device.");
    }
  }

  async function goLive() {
    setLoading(true);
    const res = await fetch(`/api/streams/${streamId}/go-live`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not go live");
      return;
    }
    toast.success("You're live.");
    router.refresh();
  }

  async function endStream() {
    setLoading(true);
    const res = await fetch(`/api/streams/${streamId}/end`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not end stream");
      return;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraOn(false);
    toast.success("Stream ended.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {liveKitEnabled && isLive ? (
        // Once live, publish through LiveKit so viewers actually see the feed.
        <LiveKitStage
          streamId={streamId}
          canPublishHint
          viewerCount={viewerCount}
          isLive
          emptyLabel="Starting your camera…"
        />
      ) : (
        <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border bg-black">
          <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <VideoOff className="size-8" />
              <p className="text-sm">Camera preview off</p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {liveKitEnabled
          ? isLive
            ? "You're broadcasting through LiveKit — viewers in this room see and hear you."
            : "This is your local preview. Hit Go Live to start publishing to viewers via LiveKit."
          : "Local preview only. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL to broadcast to viewers."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {!(liveKitEnabled && isLive) && (
          <Button variant="outline" size="sm" onClick={toggleCamera} className="gap-1.5">
            {cameraOn ? <VideoOff className="size-3.5" /> : <Video className="size-3.5" />}
            {cameraOn ? "Turn camera off" : "Turn camera on"}
          </Button>
        )}
        {!isLive ? (
          <Button size="sm" onClick={goLive} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="animate-spin" /> : <Radio className="size-3.5" />}
            Go Live
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={endStream}
            disabled={loading}
            className="gap-1.5"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Square className="size-3.5" />}
            End Stream
          </Button>
        )}
      </div>
    </div>
  );
}
