export const metadata = { title: "Responsible Play — OwnerFlow Sports" };

export default function ResponsiblePlayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Responsible Play</p>
      <h1 className="font-display text-4xl">Bet within your means</h1>
      <div className="mt-6 flex flex-col gap-4 leading-relaxed text-muted-foreground">
        <p>
          OwnerFlow Sports sells sports research, picks, and analysis. We do not accept
          wagers, and no pick or parlay on this platform is a guarantee of a winning outcome.
          Sports betting carries real financial risk — never risk money you cannot afford to
          lose.
        </p>
        <p>
          Set a budget before you bet and stick to it. Avoid chasing losses. Take breaks. If
          betting stops being entertainment and starts feeling like a compulsion, that&apos;s a
          sign to step back.
        </p>
        <p className="rounded-lg border border-border/70 bg-surface-2/60 p-4 text-foreground">
          If you or someone you know has a gambling problem, call{" "}
          <span className="font-semibold text-gold-bright">1-800-GAMBLER</span>, free and
          confidential support is available 24/7.
        </p>
        <p>You must be 21 or older to use OwnerFlow Sports.</p>
      </div>
    </div>
  );
}
