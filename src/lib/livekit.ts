import { AccessToken } from "livekit-server-sdk";

/**
 * LiveKit powers the actual video in a stream room. Without credentials the
 * app still works — the broadcaster gets a local camera preview and viewers
 * get the analysis-room view — so this stays optional.
 */
export function isLiveKitEnabled() {
  return !!(
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET &&
    process.env.NEXT_PUBLIC_LIVEKIT_URL
  );
}

export function roomNameFor(streamId: string) {
  return `ownerflow-stream-${streamId}`;
}

/**
 * Mints a room token. Publishing rights are granted only to the handicapper
 * who owns the stream; everyone else joins subscribe-only, so a viewer can't
 * push their own camera into someone's broadcast.
 */
export async function createStreamToken(params: {
  streamId: string;
  identity: string;
  name: string;
  canPublish: boolean;
}) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) throw new Error("LiveKit is not configured");

  const token = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
    ttl: "2h",
  });

  token.addGrant({
    room: roomNameFor(params.streamId),
    roomJoin: true,
    canPublish: params.canPublish,
    canPublishData: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
