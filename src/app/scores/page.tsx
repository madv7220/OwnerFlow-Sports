import Link from "next/link";
import { Radio } from "lucide-react";
import type { Sport } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { GameRow, type GameRowData } from "@/components/scores/game-row";
import { SPORT_LABELS } from "@/components/shared/sport-badge";
import { cn } from "@/lib/utils";

export const metadata = { title: "Scores & Odds — OwnerFlow Sports" };

const SPORT_FILTERS = ["all", ...Object.keys(SPORT_LABELS)] as const;

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ sport?: string }>;
}) {
  const { sport: sportParam } = await searchParams;
  const sport = sportParam && sportParam in SPORT_LABELS ? sportParam : "all";
  const where = sport !== "all" ? { sport: sport as Sport } : {};

  const [live, upcoming, recent, pickCounts, sportsWithGames] = await Promise.all([
    prisma.game.findMany({ where: { ...where, status: "LIVE" }, orderBy: { startTime: "asc" } }),
    prisma.game.findMany({
      where: { ...where, status: "SCHEDULED" },
      orderBy: { startTime: "asc" },
      take: 40,
    }),
    prisma.game.findMany({
      where: { ...where, status: "FINAL" },
      orderBy: { startTime: "desc" },
      take: 25,
    }),
    prisma.pick.groupBy({ by: ["gameId"], _count: { _all: true } }),
    prisma.game.groupBy({ by: ["sport"] }),
  ]);

  const countByGame = new Map(pickCounts.map((c) => [c.gameId, c._count._all]));
  const available = new Set(sportsWithGames.map((s) => s.sport as string));
  const decorate = (games: typeof live): GameRowData[] =>
    games.map((g) => ({ ...g, pickCount: countByGame.get(g.id) ?? 0 }));

  const sections = [
    { key: "live", title: "Live now", icon: true, games: decorate(live) },
    { key: "upcoming", title: "Upcoming", icon: false, games: decorate(upcoming) },
    { key: "final", title: "Recent finals", icon: false, games: decorate(recent) },
  ].filter((s) => s.games.length > 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Research Desk</p>
        <h1 className="font-display text-3xl sm:text-4xl">Scores &amp; Odds</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Every game on the board with the current number, live scores, and how many handicapper
          picks are riding on it.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {SPORT_FILTERS.filter((s) => s === "all" || available.has(s)).map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/scores" : `/scores?sport=${s}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              sport === s
                ? "border-gold/50 bg-primary/15 text-gold-bright"
                : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "all" ? "All sports" : SPORT_LABELS[s]}
          </Link>
        ))}
      </div>

      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-24 text-center text-muted-foreground">
          No games on the board for this sport.
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.key}>
              <h2 className="mb-3 flex items-center gap-2 font-display text-xl">
                {section.icon && <Radio className="size-4 text-crimson" />}
                {section.title}
                <span className="text-sm font-normal text-muted-foreground">
                  ({section.games.length})
                </span>
              </h2>
              <Card className="overflow-hidden py-0">
                {section.games.map((game) => (
                  <GameRow key={game.id} game={game} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
