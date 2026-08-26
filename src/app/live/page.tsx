import Link from "next/link";
import { Radio, Clock, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const metadata = { title: "Live Streams — OwnerFlow Sports" };

export default async function LivePage() {
  const streams = await prisma.stream.findMany({
    include: { handicapper: { include: { user: { select: { username: true } } } } },
    orderBy: [{ status: "asc" }, { startedAt: "desc" }],
  });

  const order = { LIVE: 0, SCHEDULED: 1, ENDED: 2 } as const;
  const sorted = [...streams].sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Watch &amp; Ask</p>
        <h1 className="font-display text-3xl sm:text-4xl">Live Streams</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Join handicappers live for slate breakdowns, late swaps, and real-time Q&amp;A.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((s) => (
          <Link key={s.id} href={`/live/${s.id}`}>
            <Card className="group h-full overflow-hidden transition-colors hover:border-gold/50">
              <div
                className="relative flex h-32 items-center justify-center overflow-hidden"
                style={{
                  background:
                    s.status === "LIVE"
                      ? "linear-gradient(135deg, rgba(193,69,69,0.25), rgba(16,18,22,1))"
                      : "linear-gradient(135deg, rgba(201,162,75,0.15), rgba(16,18,22,1))",
                }}
              >
                {s.status === "LIVE" && (
                  <Badge variant="live" className="absolute top-3 left-3 gap-1">
                    <Radio className="size-3" /> LIVE
                  </Badge>
                )}
                {s.status === "SCHEDULED" && (
                  <Badge variant="secondary" className="absolute top-3 left-3 gap-1">
                    <Clock className="size-3" /> Upcoming
                  </Badge>
                )}
                {s.status === "ENDED" && (
                  <Badge variant="secondary" className="absolute top-3 left-3">
                    Replay unavailable
                  </Badge>
                )}
                {s.status === "LIVE" && (
                  <Badge variant="secondary" className="absolute top-3 right-3 gap-1">
                    <Users className="size-3" /> {s.viewerCount}
                  </Badge>
                )}
                <Avatar className="size-14 ring-2 ring-gold/30">
                  <AvatarFallback className="text-lg">
                    {s.handicapper.displayName
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </div>
              <CardContent className="flex flex-col gap-1 p-4">
                <h3 className="font-display text-base leading-snug group-hover:text-gold-bright">
                  {s.title}
                </h3>
                <p className="text-sm text-muted-foreground">{s.handicapper.displayName}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
