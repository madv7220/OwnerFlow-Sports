import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, LineChart, Users } from "lucide-react";

export const metadata = { title: "About — OwnerFlow Sports" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">About</p>
      <h1 className="font-display text-4xl">OwnerFlow Sports</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
        OwnerFlow Sports is a research and marketplace platform built for people who take
        sports betting seriously. We connect bettors with vetted handicappers who publish
        picks, parlays, and live analysis — and we track every result automatically, so
        records mean something.
      </p>
      <p className="mt-4 leading-relaxed text-muted-foreground">
        We don&apos;t take bets. We sell access to research, analysis, and the people who
        produce it — the same way a research desk operates, not a sportsbook.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <ShieldCheck className="size-5 text-gold" />
            <h3 className="font-display text-base">Verified records</h3>
            <p className="text-sm text-muted-foreground">
              Every graded pick updates a handicapper&apos;s public record automatically.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <LineChart className="size-5 text-gold" />
            <h3 className="font-display text-base">Real economics</h3>
            <p className="text-sm text-muted-foreground">
              Handicappers keep the majority of every sale and subscription they generate.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 p-5">
            <Users className="size-5 text-gold" />
            <h3 className="font-display text-base">Built for members</h3>
            <p className="text-sm text-muted-foreground">
              Buy a single pick or subscribe — you choose the level of access.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
