import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gradeFinishedGames } from "@/lib/grading";

/**
 * Settles every pending wager on a finished game and refreshes handicapper
 * records. In production this runs on a schedule right after the odds/scores
 * sync job (see docs/ARCHITECTURE.md §4.2) — the cron caller authenticates
 * with GRADING_CRON_SECRET, while an admin can also trigger it by hand.
 */
export async function POST(req: Request) {
  const cronSecret = process.env.GRADING_CRON_SECRET;
  const providedSecret = req.headers.get("x-cron-secret");
  const authorizedByCron = !!cronSecret && providedSecret === cronSecret;

  if (!authorizedByCron) {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
  }

  const result = await gradeFinishedGames();
  return NextResponse.json({ ok: true, ...result });
}
