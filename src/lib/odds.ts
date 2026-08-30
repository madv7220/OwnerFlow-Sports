import type { Prisma, Sport } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * The Odds API (the-odds-api.com) integration.
 *
 * Two endpoints are used per sport:
 *   /v4/sports/{key}/odds    — upcoming games with spreads, totals, moneylines
 *   /v4/sports/{key}/scores  — live and recently completed scores
 *
 * Games are keyed by the provider's stable event id (`Game.externalId`), so a
 * sync upserts rather than duplicating. Prices are taken from the first
 * bookmaker returned, which is the provider's default ordering.
 */

const API_BASE = "https://api.the-odds-api.com/v4";

export function isOddsApiEnabled() {
  return !!process.env.ODDS_API_KEY;
}

/** Our Sport enum → The Odds API sport keys. */
export const SPORT_KEYS: Partial<Record<Sport, string>> = {
  NFL: "americanfootball_nfl",
  NCAAF: "americanfootball_ncaaf",
  NBA: "basketball_nba",
  NCAAB: "basketball_ncaab",
  MLB: "baseball_mlb",
  NHL: "icehockey_nhl",
  SOCCER: "soccer_epl",
  MMA: "mma_mixed_martial_arts",
};

const LEAGUE_LABELS: Partial<Record<Sport, string>> = {
  NFL: "NFL",
  NCAAF: "NCAA Football",
  NBA: "NBA",
  NCAAB: "NCAA Basketball",
  MLB: "MLB",
  NHL: "NHL",
  SOCCER: "Premier League",
  MMA: "MMA",
};

type Outcome = { name: string; price: number; point?: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; title: string; markets: Market[] };

type OddsEvent = {
  id: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: Bookmaker[];
};

type ScoreEvent = {
  id: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Odds API ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

/** Decimal/American conversion — The Odds API returns American with `oddsFormat=american`. */
function pickMarket(bookmakers: Bookmaker[], key: string) {
  for (const b of bookmakers) {
    const m = b.markets?.find((mk) => mk.key === key);
    if (m?.outcomes?.length) return m;
  }
  return null;
}

function toNumber(value: string | undefined) {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Pull the current board for one sport and upsert every event.
 * Returns how many rows were written.
 */
export async function syncSportOdds(sport: Sport) {
  const key = SPORT_KEYS[sport];
  const apiKey = process.env.ODDS_API_KEY;
  if (!key || !apiKey) return { sport, upserted: 0, skipped: true };

  const url =
    `${API_BASE}/sports/${key}/odds?apiKey=${apiKey}` +
    `&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const events = await fetchJson<OddsEvent[]>(url);

  let upserted = 0;
  for (const ev of events) {
    const h2h = pickMarket(ev.bookmakers, "h2h");
    const spreads = pickMarket(ev.bookmakers, "spreads");
    const totals = pickMarket(ev.bookmakers, "totals");

    const homeMl = h2h?.outcomes.find((o) => o.name === ev.home_team)?.price ?? null;
    const awayMl = h2h?.outcomes.find((o) => o.name === ev.away_team)?.price ?? null;
    // Spread is quoted from the home side, matching how the app renders it.
    const homeSpread = spreads?.outcomes.find((o) => o.name === ev.home_team)?.point ?? null;
    const total = totals?.outcomes.find((o) => o.name === "Over")?.point ?? null;

    const data = {
      sport,
      league: LEAGUE_LABELS[sport] ?? sport,
      homeTeam: ev.home_team,
      awayTeam: ev.away_team,
      startTime: new Date(ev.commence_time),
      spread: homeSpread,
      total,
      moneyHome: homeMl,
      moneyAway: awayMl,
    } satisfies Partial<Prisma.GameCreateInput> & Record<string, unknown>;

    await prisma.game.upsert({
      where: { externalId: ev.id },
      // Never regress a finished game back to scheduled on an odds refresh.
      update: data,
      create: { ...data, externalId: ev.id, status: "SCHEDULED" },
    });
    upserted++;
  }

  return { sport, upserted, skipped: false };
}

/**
 * Refresh scores for a sport and flip finished games to FINAL, which is what
 * makes the grading engine settle the picks attached to them.
 */
export async function syncSportScores(sport: Sport, daysFrom = 3) {
  const key = SPORT_KEYS[sport];
  const apiKey = process.env.ODDS_API_KEY;
  if (!key || !apiKey) return { sport, updated: 0, skipped: true };

  const url = `${API_BASE}/sports/${key}/scores?apiKey=${apiKey}&daysFrom=${daysFrom}`;
  const events = await fetchJson<ScoreEvent[]>(url);

  let updated = 0;
  for (const ev of events) {
    const existing = await prisma.game.findUnique({ where: { externalId: ev.id } });
    if (!existing) continue;

    const homeScore = toNumber(ev.scores?.find((s) => s.name === ev.home_team)?.score);
    const awayScore = toNumber(ev.scores?.find((s) => s.name === ev.away_team)?.score);
    const started = new Date(ev.commence_time).getTime() <= Date.now();

    const status = ev.completed ? "FINAL" : started ? "LIVE" : "SCHEDULED";
    if (
      existing.status === status &&
      existing.homeScore === homeScore &&
      existing.awayScore === awayScore
    ) {
      continue;
    }

    await prisma.game.update({
      where: { id: existing.id },
      data: { status, homeScore, awayScore },
    });
    updated++;
  }

  return { sport, updated, skipped: false };
}

/** Sports we actually pull. Configurable so a deployment can trim API usage. */
export function activeSports(): Sport[] {
  const configured = process.env.ODDS_API_SPORTS;
  const all = Object.keys(SPORT_KEYS) as Sport[];
  if (!configured) return ["NFL", "NBA", "MLB", "NHL"] as Sport[];
  const wanted = configured.split(",").map((s) => s.trim().toUpperCase());
  return all.filter((s) => wanted.includes(s));
}
