import { Radio, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function ViewerStage({
  displayName,
  status,
  viewerCount,
  needsSignIn = false,
}: {
  displayName: string;
  status: string;
  viewerCount: number;
  needsSignIn?: boolean;
}) {
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-gradient-to-br from-surface-2 via-surface to-black">
      {status === "LIVE" && (
        <>
          <Badge variant="live" className="absolute top-4 left-4 gap-1">
            <Radio className="size-3" /> LIVE
          </Badge>
          <Badge variant="secondary" className="absolute top-4 right-4 gap-1">
            <Users className="size-3" /> {viewerCount} watching
          </Badge>
        </>
      )}

      <Avatar className="size-24 ring-2 ring-gold/40">
        <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
      </Avatar>

      {status === "LIVE" && (
        <div className="mt-6 flex items-end gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-gold/70"
              style={{
                height: `${8 + ((i * 37) % 28)}px`,
                animation: `live-pulse ${1.2 + (i % 5) * 0.15}s ease-in-out infinite alternate`,
                animationDelay: `${(i % 6) * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}

      <p className="mt-4 max-w-sm text-center text-sm text-muted-foreground">
        {needsSignIn
          ? `${displayName} is live. Sign in to watch the broadcast and join the chat.`
          : status === "LIVE"
            ? `${displayName} is live in the analysis room. Follow along in chat.`
            : status === "SCHEDULED"
              ? `${displayName} hasn't started this stream yet.`
              : "This stream has ended."}
      </p>
    </div>
  );
}
