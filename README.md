# OwnerFlow Sports

A luxury research desk and marketplace for sports picks: handicappers publish
picks, parlays, and live analysis; members buy individual picks or subscribe
to a handicapper's own membership tiers; everyone gets a real-time feed and
live streaming rooms. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
the full system design and the exact production integration points (Stripe,
odds data, live video).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Prisma · SQLite (dev)
· NextAuth v5

## Getting started

```bash
npm install
npx prisma migrate deploy   # create the local SQLite database
npm run db:seed             # seed handicappers, games, picks, parlays, feed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

Every seeded account has the password `password123`.

| Role | Email | Notes |
|---|---|---|
| Member | `demo@ownerflow.demo` | Has an active subscription, purchases, and follows already seeded. |
| Handicapper | `vegas_marcus@ownerflow.demo` | Has published picks, parlays, tiers, and a live stream — visit `/studio`. |
| Admin | `admin@ownerflow.demo` | Can trigger grading via `POST /api/admin/grade`. |

New signups (`/register`) get $500 in demo wallet credit automatically so
every purchase/subscribe flow works immediately without a payment provider.

## Turning on the real integrations

Everything below is optional — with nothing configured the app runs on its demo
wallet, seeded games, and a local camera preview. Copy `.env.example` to `.env`,
fill in whichever you have, then confirm they work:

```bash
npm run check:integrations
```

That makes a real read-only call per provider, so a bad key fails here rather
than at a customer's checkout.

### Stripe — payments and payouts

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. The webhook secret is not
optional: wallet credit and subscription access are granted **only** by a
signature-verified webhook, never by the browser redirect, so a user can't get
paid features by visiting the success URL directly.

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Forward these events: `checkout.session.completed`, `invoice.paid`,
`customer.subscription.updated`, `customer.subscription.deleted`,
`account.updated`.

Handicappers connect a bank account at `/studio/payouts` via Stripe Connect
(Express). Subscriptions to a connected handicapper are billed on their behalf
with OwnerFlow taking `PLATFORM_FEE_PERCENT` as an application fee; pick sales
settle against the wallet ledger and are withdrawn on demand as Connect
transfers.

### The Odds API — live games and scores

Set `ODDS_API_KEY` (and optionally `ODDS_API_SPORTS`). Then run a sync, which
refreshes the board and settles anything that finished:

```bash
curl -X POST http://localhost:3000/api/admin/sync-odds \
  -H "x-cron-secret: $GRADING_CRON_SECRET"
```

Schedule that every few minutes on game days. Games are keyed by the provider's
event id, so syncing repeatedly updates rather than duplicates.

### LiveKit — real video

Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `NEXT_PUBLIC_LIVEKIT_URL`.
Once a handicapper hits **Go Live**, they publish camera and mic into a room and
signed-in viewers watch it. Only the stream's owner is issued a publishing
token — viewers join subscribe-only, so nobody can push their own camera into
someone else's broadcast.

## How records work

Handicapper win/loss/units/ROI are never set by hand. When a game finishes,
the grading engine (`src/lib/grading.ts`) settles every pick and parlay
attached to it and recomputes the handicapper's record from that graded
history. The seed data is built the same way — real picks against real final
scores, then graded — so every number on a profile traces back to the pick
table.

To see it run, finish a game and grade it:

```bash
# as the seeded admin, or with the GRADING_CRON_SECRET header
curl -X POST http://localhost:3000/api/admin/grade
```

In production this runs on a schedule right after the odds/scores sync — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §4.2.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm run db:seed` | Re-seed the database (`prisma/seed.ts`). |
| `npm run db:reset` | Drop and recreate the local database, then re-seed. |
| `npm run check:integrations` | Verify Stripe / Odds API / LiveKit credentials actually work. |

## Project structure

```
src/app/            Routes (App Router) — pages + API routes live side by side
src/components/      UI, organized by feature (picks, handicappers, live, studio, feed, account)
src/lib/             Prisma client, NextAuth config, access-control helpers, shared utils
prisma/schema.prisma Data model
prisma/seed.ts       Seed script — sports, games, handicappers, picks, parlays, feed, streams
docs/ARCHITECTURE.md Production architecture & integration roadmap
```
