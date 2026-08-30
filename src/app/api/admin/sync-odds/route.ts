import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { activeSports, isOddsApiEnabled, syncSportOdds, syncSportScores } from "@/lib/odds";
import { gradeFinishedGames } from "@/lib/grading";

/**
 * Refreshes the board from the odds provider, then settles anything that
 * finished. This is the job to run on a schedule (every few minutes during
 * game days) — grading is idempotent, so re-running is safe.
 *
 * Auth: the GRADING_CRON_SECRET header for the scheduler, or an ADMIN session.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.GRADING_CRON_SECRET;
  const authorizedByCron = !!cronSecret && req.headers.get("x-cron-secret") === cronSecret;

  if (!authorizedByCron) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  if (!isOddsApiEnabled()) {
    return NextResponse.json(
      { error: "ODDS_API_KEY is not configured" },
      { status: 503 },
    );
  }

  const sports = activeSports();
  const odds: unknown[] = [];
  const scores: unknown[] = [];
  const errors: { sport: string; error: string }[] = [];

  // One sport failing (an out-of-season key, a quota trip) shouldn't stop the rest.
  for (const sport of sports) {
    try {
      odds.push(await syncSportOdds(sport));
    } catch (err) {
      errors.push({ sport, error: err instanceof Error ? err.message : "odds sync failed" });
    }
    try {
      scores.push(await syncSportScores(sport));
    } catch (err) {
      errors.push({ sport, error: err instanceof Error ? err.message : "score sync failed" });
    }
  }

  const graded = await gradeFinishedGames();

  return NextResponse.json({
    ok: true,
    sports,
    odds,
    scores,
    graded,
    errors,
  });
}
