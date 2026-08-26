import { PrismaClient, Sport, BetType, PickStatus, GameStatus, Role, BillingInterval, FeedPostType, StreamStatus, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const NOW = new Date("2026-08-26T16:00:00Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const hours = (n: number) => new Date(NOW.getTime() + n * 60 * 60 * 1000);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function americanOdds() {
  const options = [-110, -115, -120, -105, +100, +105, +110, +120, +130, -130, -140, +150, -150, +160, -180];
  return pick(options);
}

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const NFL_TEAMS = [
  ["Kansas City Chiefs", "Buffalo Bills"],
  ["San Francisco 49ers", "Dallas Cowboys"],
  ["Philadelphia Eagles", "Baltimore Ravens"],
  ["Detroit Lions", "Green Bay Packers"],
  ["Miami Dolphins", "New York Jets"],
];
const NBA_TEAMS = [
  ["Boston Celtics", "Denver Nuggets"],
  ["Los Angeles Lakers", "Golden State Warriors"],
  ["Milwaukee Bucks", "Phoenix Suns"],
  ["Dallas Mavericks", "Oklahoma City Thunder"],
];
const MLB_TEAMS = [
  ["New York Yankees", "Los Angeles Dodgers"],
  ["Atlanta Braves", "Houston Astros"],
  ["Baltimore Orioles", "Philadelphia Phillies"],
  ["San Diego Padres", "Chicago Cubs"],
  ["Texas Rangers", "Seattle Mariners"],
];
const NHL_TEAMS = [
  ["Florida Panthers", "Edmonton Oilers"],
  ["Colorado Avalanche", "Toronto Maple Leafs"],
  ["New York Rangers", "Vegas Golden Knights"],
];
const NCAAF_TEAMS = [
  ["Georgia Bulldogs", "Alabama Crimson Tide"],
  ["Ohio State Buckeyes", "Michigan Wolverines"],
  ["Texas Longhorns", "Oklahoma Sooners"],
];
const SOCCER_TEAMS = [
  ["Manchester City", "Liverpool"],
  ["Real Madrid", "Barcelona"],
  ["Arsenal", "Chelsea"],
  ["Inter Milan", "AC Milan"],
];

async function seedGames() {
  const games: { id: string; sport: Sport; homeTeam: string; awayTeam: string }[] = [];

  const configs: { sport: Sport; league: string; teams: string[][]; venue: string }[] = [
    { sport: Sport.NFL, league: "NFL", teams: NFL_TEAMS, venue: "Arrowhead Stadium" },
    { sport: Sport.NBA, league: "NBA", teams: NBA_TEAMS, venue: "TD Garden" },
    { sport: Sport.MLB, league: "MLB", teams: MLB_TEAMS, venue: "Yankee Stadium" },
    { sport: Sport.NHL, league: "NHL", teams: NHL_TEAMS, venue: "Amerant Bank Arena" },
    { sport: Sport.NCAAF, league: "NCAA Football", teams: NCAAF_TEAMS, venue: "Sanford Stadium" },
    { sport: Sport.SOCCER, league: "Premier League", teams: SOCCER_TEAMS, venue: "Etihad Stadium" },
  ];

  let dayOffset = -6;
  for (const cfg of configs) {
    for (const [home, away] of cfg.teams) {
      dayOffset += 1;
      const status: GameStatus = dayOffset < -1 ? GameStatus.FINAL : dayOffset === 0 ? GameStatus.LIVE : GameStatus.SCHEDULED;
      const game = await prisma.game.create({
        data: {
          sport: cfg.sport,
          league: cfg.league,
          homeTeam: home,
          awayTeam: away,
          startTime: days(dayOffset),
          status,
          homeScore: status !== GameStatus.SCHEDULED ? randInt(0, 34) : null,
          awayScore: status !== GameStatus.SCHEDULED ? randInt(0, 34) : null,
          spread: [-1.5, -2.5, -3, -3.5, -4.5, -6, -7].sort(() => Math.random() - 0.5)[0],
          total: cfg.sport === Sport.MLB ? randInt(7, 10) + 0.5 : cfg.sport === Sport.SOCCER ? randInt(2, 3) + 0.5 : randInt(41, 54) + 0.5,
          moneyHome: -randInt(115, 220),
          moneyAway: randInt(100, 190),
          venue: cfg.venue,
        },
      });
      games.push({ id: game.id, sport: game.sport, homeTeam: home, awayTeam: away });
    }
  }
  return games;
}

// ---------------------------------------------------------------------------
// Handicappers
// ---------------------------------------------------------------------------

const HANDICAPPERS = [
  {
    username: "vegas_marcus",
    name: "Marcus Ellery",
    displayName: "Marcus \"Vegas\" Ellery",
    tagline: "20 years on the Strip. NFL & NBA sharp plays only.",
    specialties: [Sport.NFL, Sport.NBA],
    verified: true,
  },
  {
    username: "diamond_dana",
    name: "Dana Whitfield",
    displayName: "Diamond Dana",
    tagline: "MLB run-line specialist. Bullpen matchups win games.",
    specialties: [Sport.MLB],
    verified: true,
  },
  {
    username: "coach_reyes",
    name: "Alonzo Reyes",
    displayName: "Coach Reyes",
    tagline: "Former D1 coordinator. College football film breakdowns.",
    specialties: [Sport.NCAAF, Sport.NFL],
    verified: true,
  },
  {
    username: "puck_prophet",
    name: "Nadia Kowalski",
    displayName: "The Puck Prophet",
    tagline: "NHL totals and props. Goalie trends are everything.",
    specialties: [Sport.NHL],
    verified: false,
  },
  {
    username: "pitchside_paul",
    name: "Paul Osei",
    displayName: "Pitchside Paul",
    tagline: "European football scouting network. Premier League + Champions League.",
    specialties: [Sport.SOCCER],
    verified: true,
  },
  {
    username: "hoopsqueen",
    name: "Trina Boyd",
    displayName: "HoopsQueen",
    tagline: "NBA player props and live in-game betting.",
    specialties: [Sport.NBA],
    verified: false,
  },
  {
    username: "the_closer_kg",
    name: "Kenji Graham",
    displayName: "The Closer",
    tagline: "Multi-sport parlays built for volume bettors.",
    specialties: [Sport.NFL, Sport.MLB, Sport.NBA],
    verified: true,
  },
  {
    username: "southpaw_sal",
    name: "Salvatore Marino",
    displayName: "Southpaw Sal",
    tagline: "MMA and combat sports. Fight IQ over hype.",
    specialties: [Sport.MMA],
    verified: false,
  },
];

const TIER_TEMPLATES = [
  { name: "Rookie", priceCents: 1900, interval: BillingInterval.MONTHLY, perks: ["3 free picks/week", "Public record access", "Community chat"] },
  { name: "Pro", priceCents: 4900, interval: BillingInterval.MONTHLY, perks: ["All standard picks", "Parlay of the week", "DM access"] },
  { name: "Elite", priceCents: 9900, interval: BillingInterval.MONTHLY, perks: ["Every pick + prop", "Live stream access", "Bankroll strategy calls"] },
];

async function seedHandicappers() {
  const created: {
    userId: string;
    handicapperId: string;
    username: string;
    tierIds: string[];
    specialties: Sport[];
  }[] = [];

  for (const h of HANDICAPPERS) {
    const user = await prisma.user.create({
      data: {
        email: `${h.username}@ownerflow.demo`,
        username: h.username,
        name: h.name,
        passwordHash: await hash("password123"),
        role: Role.HANDICAPPER,
        walletBalance: randInt(20000, 80000),
        bio: h.tagline,
      },
    });

    const wins = randInt(58, 142);
    const losses = randInt(40, wins);
    const pushes = randInt(2, 12);
    const unitsNet = Math.round((wins * 0.91 - losses) * 10) / 10;
    const roi = Math.round(((unitsNet / (wins + losses)) * 100) * 10) / 10;

    const profile = await prisma.handicapperProfile.create({
      data: {
        userId: user.id,
        displayName: h.displayName,
        tagline: h.tagline,
        verified: h.verified,
        specialties: h.specialties.join(","),
        winCount: wins,
        lossCount: losses,
        pushCount: pushes,
        unitsNet,
        roiPercent: roi,
        ratingAvg: Math.round((3.9 + Math.random() * 1.1) * 10) / 10,
        ratingCount: randInt(40, 900),
        earningsCents: randInt(150000, 4200000),
      },
    });

    const tierIds: string[] = [];
    for (const t of TIER_TEMPLATES) {
      const tier = await prisma.membershipTier.create({
        data: {
          handicapperId: profile.id,
          name: `${h.displayName.split(" ")[0]}'s ${t.name}`,
          slug: `${h.username}-${t.name.toLowerCase()}`,
          priceCents: t.priceCents,
          interval: t.interval,
          description: `${t.name} tier membership with ${h.displayName}.`,
          perks: t.perks.join("|"),
          accentColor: t.name === "Elite" ? "#e6c774" : t.name === "Pro" ? "#c9a24b" : "#8a6d2f",
        },
      });
      tierIds.push(tier.id);
    }

    created.push({ userId: user.id, handicapperId: profile.id, username: h.username, tierIds, specialties: h.specialties });
  }

  return created;
}

// ---------------------------------------------------------------------------
// Platform tiers
// ---------------------------------------------------------------------------

async function seedPlatformTiers() {
  const defs = [
    { name: "OwnerFlow Insider", slug: "platform-insider", priceCents: 2900, interval: BillingInterval.MONTHLY, perks: ["Curated free & value picks", "Full live feed", "Odds & injury alerts"] },
    { name: "OwnerFlow VIP", slug: "platform-vip", priceCents: 7900, interval: BillingInterval.MONTHLY, perks: ["Everything in Insider", "VIP-only parlays", "Priority studio access", "Early live stream invites"] },
  ];
  const tiers = [];
  for (const d of defs) {
    tiers.push(
      await prisma.membershipTier.create({
        data: {
          name: d.name,
          slug: d.slug,
          priceCents: d.priceCents,
          interval: d.interval,
          description: `${d.name} — platform-wide OwnerFlow Sports membership.`,
          perks: d.perks.join("|"),
          isPlatform: true,
          accentColor: d.name.includes("VIP") ? "#e6c774" : "#c9a24b",
        },
      }),
    );
  }
  return tiers;
}

// ---------------------------------------------------------------------------
// Picks & parlays
// ---------------------------------------------------------------------------

const BET_TYPES = [BetType.SPREAD, BetType.MONEYLINE, BetType.TOTAL, BetType.PROP] as const;

const ANALYSES = [
  "Line movement has been sharp-side heavy since open, and the market hasn't caught up to the injury report yet. Value is on the road side here.",
  "This number is inflated by public perception. Situational spot (short week, travel) favors the underdog covering comfortably.",
  "Pace and matchup numbers both point to the total. Expect an up-tempo script from the opening whistle.",
  "Key starter questionable but trending toward playing — I'm not moving off this number until we get the final word.",
  "Historical head-to-head trends plus current form both back this side. Books are slow to adjust the total.",
  "Weather is the deciding factor tonight — wind out of the north knocks this total down more than the line suggests.",
  "Bullpen usage over the last three games is the tell here. Fade the short rest arm.",
  "This is a classic get-right spot after a bad loss. Motivation plus a soft schedule turn makes this an easy lean.",
];

async function seedPicksAndParlays(
  handicappers: Awaited<ReturnType<typeof seedHandicappers>>,
  games: Awaited<ReturnType<typeof seedGames>>,
) {
  for (const h of handicappers) {
    const relevantGames = games.filter((g) => h.specialties.includes(g.sport));
    const pool = relevantGames.length > 0 ? relevantGames : games;

    for (let i = 0; i < 9; i++) {
      const game = pick(pool);
      const isPast = i < 3;
      const status: PickStatus = isPast ? pick([PickStatus.WON, PickStatus.WON, PickStatus.LOST, PickStatus.PUSH]) : PickStatus.PENDING;

      const gateRoll = Math.random();
      const isFree = gateRoll < 0.2;
      const tierId = !isFree && gateRoll < 0.7 ? pick(h.tierIds) : null;
      const priceCents = !isFree && !tierId ? pick([499, 799, 1299, 1999]) : null;

      await prisma.pick.create({
        data: {
          handicapperId: h.handicapperId,
          gameId: game.id,
          sport: game.sport,
          betType: pick(BET_TYPES),
          selection: `${pick([game.homeTeam, game.awayTeam])} ${pick(["-3.5", "+2.5", "ML", "o47.5", "u47.5"])}`,
          odds: americanOdds(),
          unitsRisked: pick([1, 1, 1.5, 2, 3]),
          confidence: randInt(2, 5),
          analysis: pick(ANALYSES),
          tierId,
          priceCents,
          isFree,
          status,
          publishedAt: isPast ? days(-randInt(1, 5)) : hours(-randInt(0, 20)),
          resultAt: isPast ? days(-randInt(0, 1)) : null,
        },
      });
    }

    // Parlays
    for (let i = 0; i < 2; i++) {
      const legGames = [pick(pool), pick(pool), pick(pool)];
      const legOdds = legGames.map(() => americanOdds());
      const decimal = legOdds.reduce((acc, o) => acc * (o > 0 ? o / 100 + 1 : 100 / Math.abs(o) + 1), 1);
      const combined = decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
      const isPast = i === 0;
      const gateRoll = Math.random();

      const parlay = await prisma.parlay.create({
        data: {
          handicapperId: h.handicapperId,
          name: `${pick(["Weekend", "Prime Time", "Slate", "Lock", "Value"])} ${legGames.length}-Leg Parlay`,
          combinedOdds: combined,
          unitsRisked: 1,
          analysis: pick(ANALYSES),
          tierId: gateRoll < 0.6 ? pick(h.tierIds) : null,
          priceCents: gateRoll >= 0.6 ? pick([999, 1499, 2499]) : null,
          isFree: gateRoll < 0.1,
          status: isPast ? pick([PickStatus.WON, PickStatus.LOST]) : PickStatus.PENDING,
          publishedAt: isPast ? days(-2) : hours(-4),
        },
      });

      for (let j = 0; j < legGames.length; j++) {
        await prisma.parlayLeg.create({
          data: {
            parlayId: parlay.id,
            gameId: legGames[j].id,
            betType: pick(BET_TYPES),
            selection: `${pick([legGames[j].homeTeam, legGames[j].awayTeam])} ${pick(["-3.5", "+2.5", "ML"])}`,
            odds: legOdds[j],
          },
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Feed posts
// ---------------------------------------------------------------------------

const NEWS_HEADLINES = [
  { title: "Line movement alert: sharp money hammering the road favorite", type: FeedPostType.ALERT },
  { title: "Injury report: star QB listed questionable, trending toward playing", type: FeedPostType.NEWS },
  { title: "Weather watch: high winds expected to impact tonight's total", type: FeedPostType.NEWS },
  { title: "Bullpen fatigue could be the story of the week in the AL East", type: FeedPostType.ANALYSIS },
  { title: "Public betting heavily lopsided — book liability building on the favorite", type: FeedPostType.ALERT },
  { title: "Breaking: starting center ruled out for Saturday's matchup", type: FeedPostType.NEWS },
  { title: "Trap game alert: divisional dog getting no respect from the market", type: FeedPostType.ANALYSIS },
  { title: "Live update: total already flying past projections in the first half", type: FeedPostType.RESULT },
];

async function seedFeedAndFollows(
  handicappers: Awaited<ReturnType<typeof seedHandicappers>>,
  bettorIds: string[],
) {
  for (let i = 0; i < 14; i++) {
    const author = pick(handicappers);
    const headline = pick(NEWS_HEADLINES);
    await prisma.feedPost.create({
      data: {
        authorId: author.userId,
        type: headline.type,
        title: headline.title,
        body:
          "Our desk is tracking this closely — full breakdown and updated numbers going out to subscribers shortly. " +
          pick(ANALYSES),
        sport: pick(author.specialties),
        createdAt: hours(-randInt(0, 96)),
      },
    });
  }

  // Follows: each bettor follows 2-4 random handicappers
  for (const bettorId of bettorIds) {
    const shuffled = [...handicappers].sort(() => Math.random() - 0.5).slice(0, randInt(2, 4));
    for (const h of shuffled) {
      await prisma.follow.create({ data: { userId: bettorId, handicapperId: h.handicapperId } });
    }
  }
}

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

async function seedStreams(handicappers: Awaited<ReturnType<typeof seedHandicappers>>) {
  const live = pick(handicappers);
  await prisma.stream.create({
    data: {
      handicapperId: live.handicapperId,
      title: "Sunday Slate Live Breakdown + Late Swaps",
      status: StreamStatus.LIVE,
      startedAt: hours(-1),
      viewerCount: randInt(80, 640),
    },
  });

  const scheduled = pick(handicappers.filter((h) => h.handicapperId !== live.handicapperId));
  await prisma.stream.create({
    data: {
      handicapperId: scheduled.handicapperId,
      title: "Prime Time Preview & Prop Picks",
      status: StreamStatus.SCHEDULED,
      scheduledFor: hours(6),
    },
  });

  const ended = pick(handicappers.filter((h) => h.handicapperId !== live.handicapperId && h.handicapperId !== scheduled.handicapperId));
  await prisma.stream.create({
    data: {
      handicapperId: ended.handicapperId,
      title: "Weekly Bankroll Strategy Session",
      status: StreamStatus.ENDED,
      startedAt: days(-2),
      endedAt: days(-2),
      viewerCount: randInt(200, 900),
    },
  });
}

// ---------------------------------------------------------------------------
// Demo bettors
// ---------------------------------------------------------------------------

async function seedBettors() {
  const demo = await prisma.user.create({
    data: {
      email: "demo@ownerflow.demo",
      username: "demo_member",
      name: "Demo Member",
      passwordHash: await hash("password123"),
      role: Role.BETTOR,
      walletBalance: 50000,
      bio: "Exploring OwnerFlow Sports.",
    },
  });
  await prisma.walletTransaction.create({
    data: { userId: demo.id, type: TransactionType.DEPOSIT, amountCents: 50000, description: "Welcome credit" },
  });

  const others = [];
  for (const [name, username] of [
    ["Casey Nguyen", "casey_n"],
    ["Robert Diaz", "rdiaz"],
    ["Emily Chen", "emchen"],
  ]) {
    const u = await prisma.user.create({
      data: {
        email: `${username}@ownerflow.demo`,
        username,
        name,
        passwordHash: await hash("password123"),
        role: Role.BETTOR,
        walletBalance: randInt(5000, 40000),
      },
    });
    others.push(u.id);
  }

  return { demoId: demo.id, otherIds: others };
}

async function seedDemoActivity(demoId: string, handicappers: Awaited<ReturnType<typeof seedHandicappers>>) {
  const payPerPicks = await prisma.pick.findMany({ where: { priceCents: { not: null } }, take: 3 });
  for (const p of payPerPicks) {
    await prisma.purchase.create({ data: { userId: demoId, pickId: p.id, priceCents: p.priceCents! } });
    await prisma.walletTransaction.create({
      data: { userId: demoId, type: TransactionType.PICK_PURCHASE, amountCents: -p.priceCents!, description: "Pick unlock" },
    });
  }

  const payPerParlay = await prisma.parlay.findFirst({ where: { priceCents: { not: null } } });
  if (payPerParlay) {
    await prisma.purchase.create({ data: { userId: demoId, parlayId: payPerParlay.id, priceCents: payPerParlay.priceCents! } });
    await prisma.walletTransaction.create({
      data: { userId: demoId, type: TransactionType.PARLAY_PURCHASE, amountCents: -payPerParlay.priceCents!, description: "Parlay unlock" },
    });
  }

  const firstHandicapper = handicappers[0];
  const tier = await prisma.membershipTier.findFirst({ where: { handicapperId: firstHandicapper.handicapperId } });
  if (tier) {
    await prisma.subscription.create({
      data: { userId: demoId, tierId: tier.id, currentPeriodEnd: days(21) },
    });
    await prisma.walletTransaction.create({
      data: { userId: demoId, type: TransactionType.SUBSCRIPTION, amountCents: -tier.priceCents, description: `Subscribed to ${tier.name}` },
    });
  }
}

async function main() {
  console.log("Seeding OwnerFlow Sports...");
  const games = await seedGames();
  console.log(`Created ${games.length} games`);

  await seedPlatformTiers();
  const handicappers = await seedHandicappers();
  console.log(`Created ${handicappers.length} handicappers`);

  await seedPicksAndParlays(handicappers, games);
  console.log("Created picks & parlays");

  const { demoId, otherIds } = await seedBettors();
  await seedFeedAndFollows(handicappers, [demoId, ...otherIds]);
  await seedStreams(handicappers);
  await seedDemoActivity(demoId, handicappers);

  console.log("\nDemo login: demo@ownerflow.demo / password123");
  console.log("Handicapper login: vegas_marcus@ownerflow.demo / password123");
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
