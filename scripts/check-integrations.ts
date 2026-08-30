/**
 * Preflight for the third-party integrations.
 *
 *   npm run check:integrations
 *
 * Reports which of Stripe, The Odds API, and LiveKit are configured, and for
 * each configured one makes a real (read-only) call to prove the credentials
 * actually work — so a bad key is caught here rather than by a customer at
 * checkout. Nothing is written to the database and no money moves.
 */
import "dotenv/config";
import Stripe from "stripe";
import { AccessToken } from "livekit-server-sdk";

type Result = { name: string; ok: boolean; detail: string };
const results: Result[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
}

async function checkStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    record("Stripe", false, "not configured — set STRIPE_SECRET_KEY (demo wallet stays active)");
    return;
  }

  try {
    const stripe = new Stripe(key);
    // Retrieving the balance authenticates the key without touching any data.
    const balance = await stripe.balance.retrieve();
    const mode = key.startsWith("sk_live") ? "LIVE" : "test";
    const currencies = [...new Set(balance.available.map((b) => b.currency.toUpperCase()))];
    record("Stripe", true, `${mode} mode · balance in ${currencies.join(", ") || "n/a"}`);

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      record(
        "Stripe webhook",
        false,
        "STRIPE_WEBHOOK_SECRET missing — payments will NOT be credited without it",
      );
    } else {
      record("Stripe webhook", true, "signing secret present");
    }

    // Connect must be enabled for handicapper payouts to work.
    try {
      await stripe.accounts.list({ limit: 1 });
      record("Stripe Connect", true, "platform can create connected accounts");
    } catch (err) {
      record(
        "Stripe Connect",
        false,
        `${err instanceof Error ? err.message : "unavailable"} — enable Connect in the Stripe dashboard`,
      );
    }
  } catch (err) {
    record("Stripe", false, err instanceof Error ? err.message : "credential check failed");
  }
}

async function checkOddsApi() {
  const key = process.env.ODDS_API_KEY;
  if (!key) {
    record("The Odds API", false, "not configured — set ODDS_API_KEY (seeded games stay in place)");
    return;
  }

  try {
    const res = await fetch(`https://api.the-odds-api.com/v4/sports?apiKey=${key}`);
    if (!res.ok) {
      record("The Odds API", false, `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}`);
      return;
    }
    const sports = (await res.json()) as { key: string; active: boolean }[];
    const remaining = res.headers.get("x-requests-remaining");
    const active = sports.filter((s) => s.active).length;
    record(
      "The Odds API",
      true,
      `${active} active sports${remaining ? ` · ${remaining} requests remaining this period` : ""}`,
    );
  } catch (err) {
    record("The Odds API", false, err instanceof Error ? err.message : "request failed");
  }
}

async function checkLiveKit() {
  const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, NEXT_PUBLIC_LIVEKIT_URL } = process.env;
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !NEXT_PUBLIC_LIVEKIT_URL) {
    const missing = [
      !LIVEKIT_API_KEY && "LIVEKIT_API_KEY",
      !LIVEKIT_API_SECRET && "LIVEKIT_API_SECRET",
      !NEXT_PUBLIC_LIVEKIT_URL && "NEXT_PUBLIC_LIVEKIT_URL",
    ].filter(Boolean);
    record("LiveKit", false, `not configured — missing ${missing.join(", ")}`);
    return;
  }

  if (!/^wss?:\/\//.test(NEXT_PUBLIC_LIVEKIT_URL)) {
    record(
      "LiveKit",
      false,
      `NEXT_PUBLIC_LIVEKIT_URL should start with wss:// (got "${NEXT_PUBLIC_LIVEKIT_URL}")`,
    );
    return;
  }

  // Signing a token locally proves nothing about the credentials, so make a
  // real authenticated call to the LiveKit server API instead.
  try {
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: "preflight",
      ttl: "1m",
    });
    token.addGrant({ room: "preflight", roomJoin: true, canPublish: false, canSubscribe: true });
    const jwt = await token.toJwt();
    const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
    if (claims.video?.room !== "preflight") {
      record("LiveKit", false, "token is missing its room grant");
      return;
    }

    const httpUrl = NEXT_PUBLIC_LIVEKIT_URL.replace(/^ws/, "http");
    const { RoomServiceClient } = await import("livekit-server-sdk");
    const rooms = new RoomServiceClient(httpUrl, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
    const list = await rooms.listRooms();
    record("LiveKit", true, `authenticated to ${NEXT_PUBLIC_LIVEKIT_URL} · ${list.length} room(s) open`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "connection failed";
    record("LiveKit", false, `${message} — check the key, secret, and URL`);
  }
}

(async () => {
  console.log("Checking OwnerFlow Sports integrations...\n");
  await Promise.all([checkStripe(), checkOddsApi(), checkLiveKit()]);

  const pad = Math.max(...results.map((r) => r.name.length));
  for (const r of results) {
    console.log(`  ${r.ok ? "✓" : "✗"}  ${r.name.padEnd(pad)}  ${r.detail}`);
  }

  const configured = results.filter((r) => r.ok).length;
  console.log(`\n${configured}/${results.length} checks passing.`);
  console.log(
    "Anything unconfigured falls back to the built-in demo behaviour, so the app still runs.",
  );
})();
