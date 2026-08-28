import {
  PrismaClient,
  Sport,
  BetType,
  GameStatus,
  Role,
  BillingInterval,
  FeedPostType,
  StreamStatus,
  TransactionType,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { gradeFinishedGames } from "../src/lib/grading";

const prisma = new PrismaClient();

const NOW = new Date();
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);
const hours = (n: number) => new Date(NOW.getTime() + n * 60 * 60 * 1000);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Standard sportsbook juice. Spreads and totals are priced near -110 in the
 * real world — using plus money there would inflate every ROI on the platform.
 */
function juiceOdds() {
  return pick([-105, -108, -110, -110, -110, -112, -115, -118, -120]);
}
async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

// ---------------------------------------------------------------------------
// Games
// ---------------------------------------------------------------------------

const MATCHUPS: Record<string, string[][]> = {
  NFL: [
    ["Kansas City Chiefs", "Buffalo Bills"],
    ["San Francisco 49ers", "Dallas Cowboys"],
    ["Philadelphia Eagles", "Baltimore Ravens"],
    ["Detroit Lions", "Green Bay Packers"],
    ["Miami Dolphins", "New York Jets"],
    ["Cincinnati Bengals", "Pittsburgh Steelers"],
  ],
  NBA: [
    ["Boston Celtics", "Denver Nuggets"],
    ["Los Angeles Lakers", "Golden State Warriors"],
    ["Milwaukee Bucks", "Phoenix Suns"],
    ["Dallas Mavericks", "Oklahoma City Thunder"],
    ["New York Knicks", "Miami Heat"],
  ],
  MLB: [
    ["New York Yankees", "Los Angeles Dodgers"],
    ["Atlanta Braves", "Houston Astros"],
    ["Baltimore Orioles", "Philadelphia Phillies"],
    ["San Diego Padres", "Chicago Cubs"],
    ["Texas Rangers", "Seattle Mariners"],
  ],
  NHL: [
    ["Florida Panthers", "Edmonton Oilers"],
    ["Colorado Avalanche", "Toronto Maple Leafs"],
    ["New York Rangers", "Vegas Golden Knights"],
    ["Boston Bruins", "Carolina Hurricanes"],
  ],
  NCAAF: [
    ["Georgia Bulldogs", "Alabama Crimson Tide"],
    ["Ohio State Buckeyes", "Michigan Wolverines"],
    ["Texas Longhorns", "Oklahoma Sooners"],
    ["Oregon Ducks", "Washington Huskies"],
  ],
  SOCCER: [
    ["Manchester City", "Liverpool"],
    ["Real Madrid", "Barcelona"],
    ["Arsenal", "Chelsea"],
    ["Inter Milan", "AC Milan"],
  ],
};

const SPORT_CONFIG: Record<
  string,
  { league: string; venue: string; score: () => number; total: () => number; spread: () => number }
> = {
  NFL: {
    league: "NFL",
    venue: "Arrowhead Stadium",
    score: () => pick([3, 6, 7, 10, 13, 14, 17, 20, 21, 23, 24, 27, 28, 31, 34, 38]),
    total: () => randInt(38, 52) + 0.5,
    spread: () => -(randInt(1, 13) + 0.5),
  },
  NCAAF: {
    league: "NCAA Football",
    venue: "Sanford Stadium",
    score: () => pick([7, 10, 14, 17, 20, 21, 24, 27, 28, 31, 35, 38, 42, 45]),
    total: () => randInt(45, 62) + 0.5,
    spread: () => -(randInt(2, 20) + 0.5),
  },
  NBA: {
    league: "NBA",
    venue: "TD Garden",
    score: () => randInt(96, 132),
    total: () => randInt(210, 236) + 0.5,
    spread: () => -(randInt(1, 11) + 0.5),
  },
  MLB: {
    league: "MLB",
    venue: "Yankee Stadium",
    score: () => randInt(0, 9),
    total: () => randInt(7, 10) + 0.5,
    spread: () => -1.5,
  },
  NHL: {
    league: "NHL",
    venue: "Amerant Bank Arena",
    score: () => randInt(0, 6),
    total: () => randInt(5, 6) + 0.5,
    spread: () => -1.5,
  },
  SOCCER: {
    league: "Premier League",
    venue: "Etihad Stadium",
    score: () => pick([0, 0, 1, 1, 1, 2, 2, 3, 4]),
    total: () => randInt(2, 3) + 0.5,
    spread: () => -0.5,
  },
};

type SeededGame = {
  id: string;
  sport: Sport;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: GameStatus;
  startTime: Date;
  moneyHome: number | null;
  moneyAway: number | null;
  spread: number | null;
  total: number | null;
};

/** Home venues, so a matchup doesn't get filed under some other team's stadium. */
const VENUES: Record<string, string> = {
  "Kansas City Chiefs": "GEHA Field at Arrowhead Stadium",
  "San Francisco 49ers": "Levi's Stadium",
  "Philadelphia Eagles": "Lincoln Financial Field",
  "Detroit Lions": "Ford Field",
  "Miami Dolphins": "Hard Rock Stadium",
  "Cincinnati Bengals": "Paycor Stadium",
  "Boston Celtics": "TD Garden",
  "Los Angeles Lakers": "Crypto.com Arena",
  "Milwaukee Bucks": "Fiserv Forum",
  "Dallas Mavericks": "American Airlines Center",
  "New York Knicks": "Madison Square Garden",
  "New York Yankees": "Yankee Stadium",
  "Atlanta Braves": "Truist Park",
  "Baltimore Orioles": "Oriole Park at Camden Yards",
  "San Diego Padres": "Petco Park",
  "Texas Rangers": "Globe Life Field",
  "Florida Panthers": "Amerant Bank Arena",
  "Colorado Avalanche": "Ball Arena",
  "New York Rangers": "Madison Square Garden",
  "Boston Bruins": "TD Garden",
  "Georgia Bulldogs": "Sanford Stadium",
  "Ohio State Buckeyes": "Ohio Stadium",
  "Texas Longhorns": "Darrell K Royal Stadium",
  "Oregon Ducks": "Autzen Stadium",
  "Manchester City": "Etihad Stadium",
  "Real Madrid": "Santiago Bernabéu",
  Arsenal: "Emirates Stadium",
  "Inter Milan": "San Siro",
};

/** Games kick off in the afternoon or evening, not at 4am. */
function kickoff(dayOffset: number) {
  const d = days(dayOffset);
  d.setHours(pick([13, 16, 17, 19, 19, 20, 21]), pick([0, 5, 10, 15, 30, 40]), 0, 0);
  return d;
}

async function seedGames(): Promise<SeededGame[]> {
  const rows: Prisma.GameCreateManyInput[] = [];

  for (const [sportKey, matchups] of Object.entries(MATCHUPS)) {
    const cfg = SPORT_CONFIG[sportKey];
    const sport = sportKey as Sport;

    // Historical slate: eight past match days per sport give handicappers a
    // real graded track record to derive their public numbers from.
    for (let dayOffset = -30; dayOffset <= -2; dayOffset += 4) {
      for (const [home, away] of matchups) {
        rows.push({
          sport,
          league: cfg.league,
          homeTeam: home,
          awayTeam: away,
          startTime: kickoff(dayOffset),
          status: GameStatus.FINAL,
          homeScore: cfg.score(),
          awayScore: cfg.score(),
          spread: cfg.spread(),
          total: cfg.total(),
          moneyHome: -randInt(115, 220),
          moneyAway: randInt(100, 190),
          venue: VENUES[home] ?? cfg.venue,
        });
      }
    }

    // One live game per sport.
    const [liveHome, liveAway] = matchups[0];
    rows.push({
      sport,
      league: cfg.league,
      homeTeam: liveHome,
      awayTeam: liveAway,
      startTime: hours(-1),
      status: GameStatus.LIVE,
      homeScore: Math.round(cfg.score() * 0.6),
      awayScore: Math.round(cfg.score() * 0.6),
      spread: cfg.spread(),
      total: cfg.total(),
      moneyHome: -randInt(115, 220),
      moneyAway: randInt(100, 190),
      venue: VENUES[liveHome] ?? cfg.venue,
    });

    // Upcoming slate over the next week — what today's picks are made on.
    for (let dayOffset = 1; dayOffset <= 6; dayOffset += 1) {
      for (const [home, away] of matchups) {
        rows.push({
          sport,
          league: cfg.league,
          homeTeam: home,
          awayTeam: away,
          startTime: kickoff(dayOffset),
          status: GameStatus.SCHEDULED,
          homeScore: null,
          awayScore: null,
          spread: cfg.spread(),
          total: cfg.total(),
          moneyHome: -randInt(115, 220),
          moneyAway: randInt(100, 190),
          venue: VENUES[home] ?? cfg.venue,
        });
      }
    }
  }

  await prisma.game.createMany({ data: rows });
  return prisma.game.findMany({
    select: {
      id: true,
      sport: true,
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      status: true,
      startTime: true,
      moneyHome: true,
      moneyAway: true,
      spread: true,
      total: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Handicappers
// ---------------------------------------------------------------------------

const HANDICAPPERS = [
  {
    username: "vegas_marcus",
    name: "Marcus Ellery",
    displayName: 'Marcus "Vegas" Ellery',
    tagline: "20 years on the Strip. NFL & NBA sharp plays only.",
    specialties: [Sport.NFL, Sport.NBA],
    verified: true,
    hitRate: 0.6,
  },
  {
    username: "diamond_dana",
    name: "Dana Whitfield",
    displayName: "Diamond Dana",
    tagline: "MLB run-line specialist. Bullpen matchups win games.",
    specialties: [Sport.MLB],
    verified: true,
    hitRate: 0.58,
  },
  {
    username: "coach_reyes",
    name: "Alonzo Reyes",
    displayName: "Coach Reyes",
    tagline: "Former D1 coordinator. College football film breakdowns.",
    specialties: [Sport.NCAAF, Sport.NFL],
    verified: true,
    hitRate: 0.57,
  },
  {
    username: "puck_prophet",
    name: "Nadia Kowalski",
    displayName: "The Puck Prophet",
    tagline: "NHL totals and props. Goalie trends are everything.",
    specialties: [Sport.NHL],
    verified: false,
    hitRate: 0.54,
  },
  {
    username: "pitchside_paul",
    name: "Paul Osei",
    displayName: "Pitchside Paul",
    tagline: "European football scouting network. Premier League + Champions League.",
    specialties: [Sport.SOCCER],
    verified: true,
    hitRate: 0.56,
  },
  {
    username: "hoopsqueen",
    name: "Trina Boyd",
    displayName: "HoopsQueen",
    tagline: "NBA player props and live in-game betting.",
    specialties: [Sport.NBA],
    verified: false,
    hitRate: 0.55,
  },
  {
    username: "the_closer_kg",
    name: "Kenji Graham",
    displayName: "The Closer",
    tagline: "Multi-sport parlays built for volume bettors.",
    specialties: [Sport.NFL, Sport.MLB, Sport.NBA],
    verified: true,
    hitRate: 0.53,
  },
  {
    username: "southpaw_sal",
    name: "Salvatore Marino",
    displayName: "Southpaw Sal",
    tagline: "Grinding out value in the NHL and college hoops markets.",
    specialties: [Sport.NHL, Sport.NCAAF],
    verified: false,
    hitRate: 0.51,
  },
];

const TIER_TEMPLATES = [
  {
    name: "Rookie",
    priceCents: 1900,
    interval: BillingInterval.MONTHLY,
    perks: ["3 free picks/week", "Public record access", "Community chat"],
  },
  {
    name: "Pro",
    priceCents: 4900,
    interval: BillingInterval.MONTHLY,
    perks: ["All standard picks", "Parlay of the week", "DM access"],
  },
  {
    name: "Elite",
    priceCents: 9900,
    interval: BillingInterval.MONTHLY,
    perks: ["Every pick + prop", "Live stream access", "Bankroll strategy calls"],
  },
];

type SeededHandicapper = {
  userId: string;
  handicapperId: string;
  username: string;
  tierIds: string[];
  specialties: Sport[];
  hitRate: number;
};

async function seedHandicappers(): Promise<SeededHandicapper[]> {
  const created: SeededHandicapper[] = [];

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

    // Win/loss/units/ROI intentionally start at zero — they are derived from
    // real graded picks by the grading engine at the end of this seed.
    const profile = await prisma.handicapperProfile.create({
      data: {
        userId: user.id,
        displayName: h.displayName,
        tagline: h.tagline,
        verified: h.verified,
        specialties: h.specialties.join(","),
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
          accentColor:
            t.name === "Elite" ? "#e6c774" : t.name === "Pro" ? "#c9a24b" : "#8a6d2f",
        },
      });
      tierIds.push(tier.id);
    }

    created.push({
      userId: user.id,
      handicapperId: profile.id,
      username: h.username,
      tierIds,
      specialties: h.specialties,
      hitRate: h.hitRate,
    });
  }

  return created;
}

async function seedPlatformTiers() {
  const defs = [
    {
      name: "OwnerFlow Insider",
      slug: "platform-insider",
      priceCents: 2900,
      perks: ["Curated free & value picks", "Full live feed", "Odds & injury alerts"],
    },
    {
      name: "OwnerFlow VIP",
      slug: "platform-vip",
      priceCents: 7900,
      perks: [
        "Everything in Insider",
        "VIP-only parlays",
        "Priority studio access",
        "Early live stream invites",
      ],
    },
  ];
  for (const d of defs) {
    await prisma.membershipTier.create({
      data: {
        name: d.name,
        slug: d.slug,
        priceCents: d.priceCents,
        interval: BillingInterval.MONTHLY,
        description: `${d.name} — platform-wide OwnerFlow Sports membership.`,
        perks: d.perks.join("|"),
        isPlatform: true,
        accentColor: d.name.includes("VIP") ? "#e6c774" : "#c9a24b",
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Picks & parlays
// ---------------------------------------------------------------------------

const ANALYSES = [
  "Line movement has been sharp-side heavy since open, and the market hasn't caught up to the injury report yet. Value is on the road side here.",
  "This number is inflated by public perception. Situational spot (short week, travel) favors the underdog covering comfortably.",
  "Pace and matchup numbers both point to the total. Expect an up-tempo script from the opening whistle.",
  "Key starter is questionable but trending toward playing — I'm not moving off this number until we get the final word.",
  "Historical head-to-head trends plus current form both back this side. Books are slow to adjust the total.",
  "Weather is the deciding factor tonight — wind out of the north knocks this total down more than the line suggests.",
  "Bullpen usage over the last three games is the tell here. Fade the short-rest arm.",
  "This is a classic get-right spot after a bad loss. Motivation plus a soft schedule turn makes this an easy lean.",
];

const half = (n: number) => Math.round(n * 2) / 2;

/**
 * Build a selection string for a finished game that will grade to a known
 * result. Lines land within a few points of the real margin, which is what a
 * realistic market number looks like — and it means every historical record on
 * the platform traces back to a genuinely graded wager.
 */
function buildGradedSelection(
  game: SeededGame,
  betType: BetType,
  wantWin: boolean,
): { selection: string; betType: BetType; odds: number } | null {
  const homeScore = game.homeScore!;
  const awayScore = game.awayScore!;

  if (betType === "MONEYLINE") {
    if (homeScore === awayScore) return null; // draw — no moneyline result
    const homeWon = homeScore > awayScore;
    const takeHome = wantWin ? homeWon : !homeWon;
    return {
      selection: `${takeHome ? game.homeTeam : game.awayTeam} ML`,
      betType,
      // Price the wager at the game's actual market number for that side.
      odds: (takeHome ? game.moneyHome : game.moneyAway) ?? -110,
    };
  }

  if (betType === "TOTAL") {
    const total = homeScore + awayScore;
    let offset = pick([0.5, 1.5, 2.5, 3.5]);
    // An over cashes when the line sits below the real total, and vice versa.
    // Only the "line below total" cases are constrained: the line must stay
    // above zero, which is impossible for a 0-0 final.
    let takeOver = Math.random() < 0.5;
    const needsLineBelowTotal = takeOver === wantWin;
    if (needsLineBelowTotal && total < 1) {
      takeOver = !takeOver; // flip to the side that can be priced above the total
    } else if (needsLineBelowTotal && total - offset < 0.5) {
      offset = total - 0.5; // shrink the offset so the line stays positive
    }
    const line = takeOver === wantWin ? total - offset : total + offset;
    return {
      selection: `${takeOver ? "o" : "u"}${half(line)}`,
      betType,
      odds: juiceOdds(),
    };
  }

  const takeHome = Math.random() < 0.5;
  const team = takeHome ? game.homeTeam : game.awayTeam;
  const margin = (takeHome ? homeScore : awayScore) - (takeHome ? awayScore : homeScore);
  const offset = pick([0.5, 1.5, 2.5, 3.5]);
  const line = half(wantWin ? -margin + offset : -margin - offset);
  return {
    selection: `${team} ${line >= 0 ? "+" : ""}${line}`,
    betType,
    odds: juiceOdds(),
  };
}

/**
 * Picks on games that haven't been played yet are written against the game's
 * own posted number, so a total on an NFL game reads o47.5 rather than some
 * figure unrelated to the board.
 */
function buildUpcomingSelection(game: SeededGame, betType: BetType) {
  const takeHome = Math.random() < 0.5;
  const team = takeHome ? game.homeTeam : game.awayTeam;

  switch (betType) {
    case "MONEYLINE":
      return `${team} ML`;
    case "TOTAL": {
      const line = game.total ?? 45.5;
      // Handicappers occasionally buy a half point off the posted number.
      const shaded = half(line + pick([0, 0, 0, -0.5, 0.5]));
      return `${Math.random() < 0.5 ? "o" : "u"}${shaded}`;
    }
    case "PROP": {
      const teamTotal = half((game.total ?? 45.5) / 2 + pick([-1.5, -0.5, 0.5, 1.5]));
      return `${team} team total over ${Math.max(0.5, teamTotal)}`;
    }
    default: {
      // game.spread is quoted from the home side; flip it for the road team.
      const homeLine = game.spread ?? -3.5;
      const line = half(takeHome ? homeLine : -homeLine);
      return `${team} ${line >= 0 ? "+" : ""}${line}`;
    }
  }
}

function gateFor(handicapper: SeededHandicapper) {
  const roll = Math.random();
  if (roll < 0.18) return { isFree: true, tierId: null, priceCents: null };
  if (roll < 0.68)
    return { isFree: false, tierId: pick(handicapper.tierIds), priceCents: null };
  return { isFree: false, tierId: null, priceCents: pick([499, 799, 1299, 1999]) };
}

/**
 * Sides and totals are the bread and butter of a handicapping service;
 * moneylines are the minority. Weighting the mix this way keeps the derived
 * ROI figures in a believable range instead of being skewed by plus money.
 */
function weightedBetType() {
  const roll = Math.random();
  if (roll < 0.45) return BetType.SPREAD;
  if (roll < 0.85) return BetType.TOTAL;
  return BetType.MONEYLINE;
}

async function seedPicksAndParlays(handicappers: SeededHandicapper[], games: SeededGame[]) {
  const finalGames = games.filter((g) => g.status === GameStatus.FINAL);
  const upcomingGames = games.filter((g) => g.status !== GameStatus.FINAL);

  const pickRows: Prisma.PickCreateManyInput[] = [];

  for (const h of handicappers) {
    const historyPool = finalGames.filter((g) => h.specialties.includes(g.sport));
    const upcomingPool = upcomingGames.filter((g) => h.specialties.includes(g.sport));

    // Historical, gradable picks — the basis of the public record. The exact
    // number of winners is fixed up front and shuffled rather than coin-flipped
    // per pick, so a handicapper's derived record lands on their intended hit
    // rate every seed instead of swinging with Bernoulli variance.
    const historyCount = randInt(46, 68);
    const outcomes = Array.from({ length: historyCount }, (_, i) => i < Math.round(historyCount * h.hitRate));
    for (let i = outcomes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outcomes[i], outcomes[j]] = [outcomes[j], outcomes[i]];
    }

    for (let i = 0; i < historyCount; i++) {
      const game = pick(historyPool.length ? historyPool : finalGames);
      const betType = weightedBetType();
      const built = buildGradedSelection(game, betType, outcomes[i]);
      if (!built) continue;
      const gate = gateFor(h);

      pickRows.push({
        handicapperId: h.handicapperId,
        gameId: game.id,
        sport: game.sport,
        betType: built.betType,
        selection: built.selection,
        odds: built.odds,
        unitsRisked: pick([1, 1, 1, 1.5, 2, 2, 3]),
        confidence: randInt(2, 5),
        analysis: pick(ANALYSES),
        ...gate,
        publishedAt: new Date(game.startTime.getTime() - 6 * 60 * 60 * 1000),
      });
    }

    // Live board — picks on games that haven't started yet.
    const upcomingCount = randInt(6, 10);
    for (let i = 0; i < upcomingCount; i++) {
      const game = pick(upcomingPool.length ? upcomingPool : upcomingGames);
      const betType = Math.random() < 0.12 ? BetType.PROP : weightedBetType();
      const gate = gateFor(h);

      pickRows.push({
        handicapperId: h.handicapperId,
        gameId: game.id,
        sport: game.sport,
        betType,
        selection: buildUpcomingSelection(game, betType),
        odds: betType === BetType.MONEYLINE ? (game.moneyAway ?? -110) : juiceOdds(),
        unitsRisked: pick([1, 1, 1.5, 2, 3]),
        confidence: randInt(2, 5),
        analysis: pick(ANALYSES),
        ...gate,
        publishedAt: hours(-randInt(1, 30)),
      });
    }
  }

  await prisma.pick.createMany({ data: pickRows });

  // Parlays: six settled and one live per handicapper. Long-shot tickets are
  // staked at a fraction of a unit — the way a disciplined bettor plays them —
  // so one lucky four-leg hit can't distort a whole ROI figure.
  for (const h of handicappers) {
    const historyPool = finalGames.filter((g) => h.specialties.includes(g.sport));
    const upcomingPool = upcomingGames.filter((g) => h.specialties.includes(g.sport));

    for (let p = 0; p < 7; p++) {
      const settled = p < 6;
      const pool = settled
        ? historyPool.length
          ? historyPool
          : finalGames
        : upcomingPool.length
          ? upcomingPool
          : upcomingGames;

      const legCount = randInt(2, 4);
      const legs: { gameId: string; betType: BetType; selection: string; odds: number }[] = [];
      // A parlay only cashes if every leg does, so the hit rate compounds.
      const shouldWin = settled && Math.random() < Math.pow(h.hitRate, legCount);

      for (let i = 0; i < legCount; i++) {
        const game = pick(pool);
        const betType = weightedBetType();
        if (settled) {
          // One deliberate loser sinks a losing ticket; otherwise all legs cash.
          const legWins = shouldWin || i !== 0;
          const built = buildGradedSelection(game, betType, legWins);
          if (!built) continue;
          legs.push({
            gameId: game.id,
            betType: built.betType,
            selection: built.selection,
            odds: built.odds,
          });
        } else {
          legs.push({
            gameId: game.id,
            betType,
            selection: buildUpcomingSelection(game, betType),
            odds: betType === BetType.MONEYLINE ? (game.moneyAway ?? -110) : juiceOdds(),
          });
        }
      }

      if (legs.length < 2) continue;

      const decimal = legs.reduce(
        (acc, l) => acc * (l.odds > 0 ? l.odds / 100 + 1 : 100 / Math.abs(l.odds) + 1),
        1,
      );
      const combinedOdds =
        decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
      const gate = gateFor(h);

      await prisma.parlay.create({
        data: {
          handicapperId: h.handicapperId,
          name: `${pick(["Weekend", "Prime Time", "Slate", "Lock", "Value", "Night Cap"])} ${legs.length}-Leg Parlay`,
          combinedOdds,
          unitsRisked: pick([0.25, 0.5, 0.5, 1]),
          analysis: pick(ANALYSES),
          ...gate,
          publishedAt: settled ? days(-randInt(3, 20)) : hours(-randInt(1, 12)),
          legs: { create: legs },
        },
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Feed, follows, streams
// ---------------------------------------------------------------------------

const NEWS = [
  { title: "Line movement alert: sharp money hammering the road favorite", type: FeedPostType.ALERT },
  { title: "Injury report: star QB listed questionable, trending toward playing", type: FeedPostType.NEWS },
  { title: "Weather watch: high winds expected to impact tonight's total", type: FeedPostType.NEWS },
  { title: "Bullpen fatigue could be the story of the week in the AL East", type: FeedPostType.ANALYSIS },
  { title: "Public betting heavily lopsided — book liability building on the favorite", type: FeedPostType.ALERT },
  { title: "Breaking: starting center ruled out for Saturday's matchup", type: FeedPostType.NEWS },
  { title: "Trap game alert: divisional dog getting no respect from the market", type: FeedPostType.ANALYSIS },
  { title: "Closing line value report: where our card beat the number this week", type: FeedPostType.RESULT },
];

async function seedFeedAndFollows(handicappers: SeededHandicapper[], bettorIds: string[]) {
  for (let i = 0; i < 18; i++) {
    const author = pick(handicappers);
    const headline = pick(NEWS);
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

  for (const bettorId of bettorIds) {
    const shuffled = [...handicappers].sort(() => Math.random() - 0.5).slice(0, randInt(2, 4));
    for (const h of shuffled) {
      await prisma.follow.create({
        data: { userId: bettorId, handicapperId: h.handicapperId },
      });
    }
  }
}

async function seedStreams(handicappers: SeededHandicapper[]) {
  const [live, scheduled, ended] = [...handicappers].sort(() => Math.random() - 0.5);

  await prisma.stream.create({
    data: {
      handicapperId: live.handicapperId,
      title: "Sunday Slate Live Breakdown + Late Swaps",
      status: StreamStatus.LIVE,
      startedAt: hours(-1),
      viewerCount: randInt(80, 640),
    },
  });
  await prisma.stream.create({
    data: {
      handicapperId: scheduled.handicapperId,
      title: "Prime Time Preview & Prop Picks",
      status: StreamStatus.SCHEDULED,
      scheduledFor: hours(6),
    },
  });
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
// Members
// ---------------------------------------------------------------------------

async function seedMembers() {
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
    data: {
      userId: demo.id,
      type: TransactionType.DEPOSIT,
      amountCents: 50000,
      description: "Welcome credit",
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@ownerflow.demo",
      username: "ownerflow_admin",
      name: "OwnerFlow Admin",
      passwordHash: await hash("password123"),
      role: Role.ADMIN,
      walletBalance: 0,
    },
  });

  const others: string[] = [];
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

async function seedDemoActivity(demoId: string, handicappers: SeededHandicapper[]) {
  const payPerPicks = await prisma.pick.findMany({
    where: { priceCents: { not: null }, status: "PENDING" },
    take: 3,
  });
  for (const p of payPerPicks) {
    await prisma.purchase.create({
      data: { userId: demoId, pickId: p.id, priceCents: p.priceCents! },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: demoId,
        type: TransactionType.PICK_PURCHASE,
        amountCents: -p.priceCents!,
        description: "Pick unlock",
      },
    });
  }

  const payPerParlay = await prisma.parlay.findFirst({ where: { priceCents: { not: null } } });
  if (payPerParlay) {
    await prisma.purchase.create({
      data: { userId: demoId, parlayId: payPerParlay.id, priceCents: payPerParlay.priceCents! },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: demoId,
        type: TransactionType.PARLAY_PURCHASE,
        amountCents: -payPerParlay.priceCents!,
        description: "Parlay unlock",
      },
    });
  }

  const tier = await prisma.membershipTier.findFirst({
    where: { handicapperId: handicappers[0].handicapperId },
  });
  if (tier) {
    await prisma.subscription.create({
      data: { userId: demoId, tierId: tier.id, currentPeriodEnd: days(21) },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: demoId,
        type: TransactionType.SUBSCRIPTION,
        amountCents: -tier.priceCents,
        description: `Subscribed to ${tier.name}`,
      },
    });
  }
}

async function main() {
  console.log("Seeding OwnerFlow Sports...");

  const games = await seedGames();
  console.log(`  ${games.length} games`);

  await seedPlatformTiers();
  const handicappers = await seedHandicappers();
  console.log(`  ${handicappers.length} handicappers`);

  await seedPicksAndParlays(handicappers, games);
  console.log(`  ${await prisma.pick.count()} picks, ${await prisma.parlay.count()} parlays`);

  const { demoId, otherIds } = await seedMembers();
  await seedFeedAndFollows(handicappers, [demoId, ...otherIds]);
  await seedStreams(handicappers);
  await seedDemoActivity(demoId, handicappers);

  // Settle every finished wager so each handicapper's public record is derived
  // from real graded results rather than invented numbers.
  const graded = await gradeFinishedGames();
  console.log(
    `  graded ${graded.gradedPicks} picks and ${graded.gradedParlays} parlays across ${graded.handicappersUpdated} handicappers`,
  );

  const top = await prisma.handicapperProfile.findMany({
    orderBy: { roiPercent: "desc" },
    select: { displayName: true, winCount: true, lossCount: true, roiPercent: true },
    take: 3,
  });
  for (const t of top) {
    console.log(`    ${t.displayName}: ${t.winCount}-${t.lossCount} (${t.roiPercent}% ROI)`);
  }

  console.log("\nLogins (password123):");
  console.log("  member       demo@ownerflow.demo");
  console.log("  handicapper  vegas_marcus@ownerflow.demo");
  console.log("  admin        admin@ownerflow.demo");
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
