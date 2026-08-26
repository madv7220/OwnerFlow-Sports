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

New signups (`/register`) get $500 in demo wallet credit automatically so
every purchase/subscribe flow works immediately without a payment provider.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server. |
| `npm run build` | Production build. |
| `npm run db:seed` | Re-seed the database (`prisma/seed.ts`). |
| `npm run db:reset` | Drop and recreate the local database, then re-seed. |

## Project structure

```
src/app/            Routes (App Router) — pages + API routes live side by side
src/components/      UI, organized by feature (picks, handicappers, live, studio, feed, account)
src/lib/             Prisma client, NextAuth config, access-control helpers, shared utils
prisma/schema.prisma Data model
prisma/seed.ts       Seed script — sports, games, handicappers, picks, parlays, feed, streams
docs/ARCHITECTURE.md Production architecture & integration roadmap
```
