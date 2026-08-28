/**
 * Pick grading engine.
 *
 * Picks are stored with an explicit `betType` plus a human-readable
 * `selection` string (e.g. "Kansas City Chiefs -3.5", "Lakers ML", "o47.5").
 * These helpers parse that selection, grade it against a finished game's
 * score, and settle the unit P/L — which is what drives every handicapper
 * record on the platform.
 *
 * Everything here is pure except `gradeFinishedGames` / `recomputeHandicapperRecord`,
 * so the parsing and settlement rules can be reasoned about (and tested) directly.
 */

import type { BetType, PickStatus } from "@prisma/client";
// Relative import so this module is usable from both the Next.js app and the
// standalone seed/cron scripts, which don't resolve the "@/" alias.
import { prisma } from "./prisma";

export type GradableGame = {
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type ParsedSelection =
  | { kind: "SPREAD"; team: "HOME" | "AWAY"; line: number }
  | { kind: "MONEYLINE"; team: "HOME" | "AWAY" }
  | { kind: "TOTAL"; direction: "OVER" | "UNDER"; line: number }
  | null;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Decide which side of the game a selection refers to. Matches on the full
 * team name first, then falls back to the nickname (last word, e.g. "Chiefs"),
 * which is how bettors usually write a pick.
 */
export function matchTeam(selection: string, game: GradableGame): "HOME" | "AWAY" | null {
  const text = normalize(selection);
  const home = normalize(game.homeTeam);
  const away = normalize(game.awayTeam);

  if (text.includes(home)) return "HOME";
  if (text.includes(away)) return "AWAY";

  const homeNick = home.split(" ").at(-1);
  const awayNick = away.split(" ").at(-1);
  // Only trust a nickname when it is unambiguous between the two sides.
  if (homeNick && awayNick && homeNick !== awayNick) {
    const hasHome = new RegExp(`\\b${homeNick}\\b`).test(text);
    const hasAway = new RegExp(`\\b${awayNick}\\b`).test(text);
    if (hasHome && !hasAway) return "HOME";
    if (hasAway && !hasHome) return "AWAY";
  }
  return null;
}

export function parseSelection(
  betType: BetType,
  selection: string,
  game: GradableGame,
): ParsedSelection {
  const text = selection.trim();

  if (betType === "TOTAL") {
    const match =
      text.match(/\b(?:o|over)\s*(\d+(?:\.\d+)?)/i) ??
      text.match(/\b(?:u|under)\s*(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const direction = /\b(?:o|over)/i.test(match[0]) ? "OVER" : "UNDER";
    return { kind: "TOTAL", direction, line: Number(match[1]) };
  }

  const team = matchTeam(text, game);
  if (!team) return null;

  if (betType === "MONEYLINE") return { kind: "MONEYLINE", team };

  if (betType === "SPREAD") {
    const match = text.match(/([+-]\s*\d+(?:\.\d+)?)/);
    if (!match) return null;
    const line = Number(match[1].replace(/\s+/g, ""));
    return { kind: "SPREAD", team, line };
  }

  // PROP bets carry no machine-readable line — they need manual settlement.
  return null;
}

/**
 * Grade a single pick. Returns null when the pick cannot be graded
 * automatically (unfinished game, prop bet, or an unparseable selection),
 * in which case it is left PENDING for manual settlement.
 */
export function gradePick(
  betType: BetType,
  selection: string,
  game: GradableGame,
): PickStatus | null {
  if (game.homeScore === null || game.awayScore === null) return null;

  const parsed = parseSelection(betType, selection, game);
  if (!parsed) return null;

  if (parsed.kind === "TOTAL") {
    const total = game.homeScore + game.awayScore;
    if (total === parsed.line) return "PUSH";
    const wentOver = total > parsed.line;
    return (parsed.direction === "OVER") === wentOver ? "WON" : "LOST";
  }

  const teamScore = parsed.team === "HOME" ? game.homeScore : game.awayScore;
  const oppScore = parsed.team === "HOME" ? game.awayScore : game.homeScore;

  if (parsed.kind === "MONEYLINE") {
    if (teamScore === oppScore) return "PUSH";
    return teamScore > oppScore ? "WON" : "LOST";
  }

  // SPREAD: apply the line to the selected team's score.
  const adjusted = teamScore + parsed.line;
  if (adjusted === oppScore) return "PUSH";
  return adjusted > oppScore ? "WON" : "LOST";
}

/**
 * A parlay wins only if every leg wins. Pushed legs drop out of the ticket
 * (standard sportsbook behaviour); an all-push ticket is itself a push.
 * Any unresolved leg leaves the whole parlay pending.
 */
export function gradeParlay(legStatuses: (PickStatus | null)[]): PickStatus | null {
  if (legStatuses.some((s) => s === "LOST")) return "LOST";
  if (legStatuses.some((s) => s === null || s === "PENDING")) return null;
  if (legStatuses.every((s) => s === "PUSH")) return "PUSH";
  return "WON";
}

/**
 * Unit profit/loss for a settled wager at American odds.
 * Risking 1 unit at -110 returns 0.91 units; at +150 it returns 1.5.
 */
export function settleUnits(status: PickStatus, odds: number, unitsRisked: number) {
  if (status === "WON") {
    const multiplier = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    return unitsRisked * multiplier;
  }
  if (status === "LOST") return -unitsRisked;
  return 0;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Rebuild a handicapper's public record from their actual settled picks and
 * parlays. This is the only writer of win/loss/units/ROI — the numbers on a
 * profile are always derived from real graded history, never set by hand.
 */
export async function recomputeHandicapperRecord(handicapperId: string) {
  const [picks, parlays] = await Promise.all([
    prisma.pick.findMany({
      where: { handicapperId, status: { not: "PENDING" } },
      select: { status: true, odds: true, unitsRisked: true },
    }),
    prisma.parlay.findMany({
      where: { handicapperId, status: { not: "PENDING" } },
      select: { status: true, combinedOdds: true, unitsRisked: true },
    }),
  ]);

  const wagers = [
    ...picks.map((p) => ({ status: p.status, odds: p.odds, units: p.unitsRisked })),
    ...parlays.map((p) => ({ status: p.status, odds: p.combinedOdds, units: p.unitsRisked })),
  ];

  let winCount = 0;
  let lossCount = 0;
  let pushCount = 0;
  let unitsNet = 0;
  let unitsRisked = 0;

  for (const w of wagers) {
    if (w.status === "WON") winCount++;
    else if (w.status === "LOST") lossCount++;
    else if (w.status === "PUSH") pushCount++;

    unitsNet += settleUnits(w.status, w.odds, w.units);
    // Pushes return the stake, so they don't count as money at risk.
    if (w.status !== "PUSH") unitsRisked += w.units;
  }

  const roiPercent = unitsRisked > 0 ? (unitsNet / unitsRisked) * 100 : 0;

  await prisma.handicapperProfile.update({
    where: { id: handicapperId },
    data: {
      winCount,
      lossCount,
      pushCount,
      unitsNet: round1(unitsNet),
      roiPercent: round1(roiPercent),
    },
  });

  return { winCount, lossCount, pushCount, unitsNet: round1(unitsNet), roiPercent: round1(roiPercent) };
}

/**
 * Settle every pending pick and parlay attached to a game that has finished,
 * then refresh the record of each handicapper whose wagers moved.
 */
export async function gradeFinishedGames() {
  const now = new Date();
  const touched = new Set<string>();
  let gradedPicks = 0;
  let gradedParlays = 0;

  const pendingPicks = await prisma.pick.findMany({
    where: { status: "PENDING", game: { status: "FINAL" } },
    include: { game: true },
  });

  for (const pick of pendingPicks) {
    const status = gradePick(pick.betType, pick.selection, pick.game);
    if (!status) continue;
    await prisma.pick.update({
      where: { id: pick.id },
      data: { status, resultAt: now },
    });
    touched.add(pick.handicapperId);
    gradedPicks++;
  }

  const pendingParlays = await prisma.parlay.findMany({
    where: { status: "PENDING" },
    include: { legs: { include: { game: true } } },
  });

  for (const parlay of pendingParlays) {
    const legStatuses = parlay.legs.map((leg) =>
      leg.game.status === "FINAL" ? gradePick(leg.betType, leg.selection, leg.game) : null,
    );
    const status = gradeParlay(legStatuses);
    if (!status) continue;
    await prisma.parlay.update({
      where: { id: parlay.id },
      data: { status, resultAt: now },
    });
    touched.add(parlay.handicapperId);
    gradedParlays++;
  }

  for (const handicapperId of touched) {
    await recomputeHandicapperRecord(handicapperId);
  }

  return { gradedPicks, gradedParlays, handicappersUpdated: touched.size };
}
