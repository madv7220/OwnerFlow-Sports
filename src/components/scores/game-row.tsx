import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/shared/sport-badge";
import { formatOdds } from "@/lib/utils";

export type GameRowData = {
  id: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  startTime: Date;
  spread: number | null;
  total: number | null;
  moneyHome: number | null;
  moneyAway: number | null;
  venue: string | null;
  pickCount: number;
};

function timeLabel(game: GameRowData) {
  if (game.status === "LIVE") return "In progress";
  if (game.status === "FINAL") {
    return game.startTime.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return game.startTime.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TeamLine({
  team,
  score,
  isWinner,
  showScore,
}: {
  team: string;
  score: number | null;
  isWinner: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          isWinner && showScore ? "text-sm font-semibold text-foreground" : "text-sm text-foreground/80"
        }
      >
        {team}
      </span>
      {showScore && (
        <span
          className={
            isWinner
              ? "font-mono-num text-sm font-semibold text-gold-bright"
              : "font-mono-num text-sm text-muted-foreground"
          }
        >
          {score}
        </span>
      )}
    </div>
  );
}

export function GameRow({ game }: { game: GameRowData }) {
  const showScore = game.status !== "SCHEDULED" && game.homeScore !== null;
  const homeWon = showScore && (game.homeScore ?? 0) > (game.awayScore ?? 0);
  const awayWon = showScore && (game.awayScore ?? 0) > (game.homeScore ?? 0);

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-border/60 px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-2/40 sm:grid-cols-[7rem_1fr_auto]">
      <div className="flex items-center gap-2 sm:flex-col sm:items-start sm:justify-center sm:gap-1">
        <SportBadge sport={game.sport} />
        <span className="text-xs text-muted-foreground">{timeLabel(game)}</span>
        {game.status === "LIVE" && (
          <Badge variant="live" className="gap-1 text-[10px]">
            <span className="live-dot inline-block size-1.5 rounded-full bg-crimson" />
            LIVE
          </Badge>
        )}
      </div>

      <div className="flex min-w-0 flex-col justify-center gap-1">
        <TeamLine team={game.awayTeam} score={game.awayScore} isWinner={awayWon} showScore={showScore} />
        <TeamLine team={game.homeTeam} score={game.homeScore} isWinner={homeWon} showScore={showScore} />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <OddsCell label="Spread" value={game.spread !== null ? `${game.spread}` : "—"} />
        <OddsCell label="Total" value={game.total !== null ? `o/u ${game.total}` : "—"} />
        <OddsCell
          label="Money"
          value={
            game.moneyHome !== null && game.moneyAway !== null
              ? `${formatOdds(game.moneyAway)} / ${formatOdds(game.moneyHome)}`
              : "—"
          }
        />
        {game.pickCount > 0 ? (
          <Link
            href={`/picks?sport=${game.sport}`}
            className="shrink-0 rounded-md border border-gold/30 bg-primary/10 px-2.5 py-1.5 text-center text-[11px] font-medium text-gold-bright transition-colors hover:bg-primary/20"
          >
            {game.pickCount} pick{game.pickCount === 1 ? "" : "s"}
          </Link>
        ) : (
          <span className="shrink-0 px-2.5 py-1.5 text-[11px] text-muted-foreground">No picks</span>
        )}
      </div>
    </div>
  );
}

function OddsCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="hidden min-w-[4.5rem] flex-col items-center rounded-md bg-surface-2/60 px-2 py-1.5 md:flex">
      <span className="text-[9px] tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className="font-mono-num text-xs text-foreground">{value}</span>
    </div>
  );
}
