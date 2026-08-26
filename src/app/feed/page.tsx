import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FeedPostCard } from "@/components/feed/feed-post-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SportBadge } from "@/components/shared/sport-badge";
import Link from "next/link";
import { Radio } from "lucide-react";

export const metadata = { title: "Live Feed — OwnerFlow Sports" };

export default async function FeedPage() {
  const session = await auth();

  const [posts, liveGames, liveStreams] = await Promise.all([
    prisma.feedPost.findMany({
      include: {
        author: { select: { name: true, username: true } },
        likes: { select: { userId: true } },
        comments: {
          include: { user: { select: { name: true, username: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.game.findMany({ where: { status: "LIVE" }, take: 6 }),
    prisma.stream.findMany({
      where: { status: "LIVE" },
      include: { handicapper: { select: { displayName: true, user: { select: { username: true } } } } },
      take: 4,
    }),
  ]);

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
      <div>
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Real-time</p>
          <h1 className="font-display text-3xl sm:text-4xl">Live Feed</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Line movement, injury alerts, and analysis from the handicappers you follow — as it happens.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              id={post.id}
              title={post.title}
              body={post.body}
              type={post.type}
              sport={post.sport}
              createdAt={post.createdAt.toISOString()}
              author={post.author}
              initialLikeCount={post.likes.length}
              initiallyLiked={session?.user?.id ? post.likes.some((l) => l.userId === session.user!.id) : false}
              initialComments={post.comments.map((c) => ({
                id: c.id,
                body: c.body,
                createdAt: c.createdAt.toISOString(),
                user: c.user,
              }))}
            />
          ))}
        </div>
      </div>

      <aside className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="live-dot inline-block size-2 rounded-full bg-crimson" />
              Live Scoreboard
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {liveGames.length === 0 ? (
              <p className="text-sm text-muted-foreground">No games live right now.</p>
            ) : (
              liveGames.map((g) => (
                <div key={g.id} className="rounded-md border border-border/70 bg-surface-2/60 p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <SportBadge sport={g.sport} />
                    <Badge variant="live" className="text-[10px]">LIVE</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{g.awayTeam}</span>
                    <span className="font-mono-num">{g.awayScore}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>{g.homeTeam}</span>
                    <span className="font-mono-num">{g.homeScore}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="size-4 text-crimson" /> Live Now
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {liveStreams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No handicappers streaming right now.</p>
            ) : (
              liveStreams.map((s) => (
                <Link
                  key={s.id}
                  href="/live"
                  className="rounded-md border border-border/70 bg-surface-2/60 p-2.5 text-sm transition-colors hover:border-gold/40"
                >
                  <div className="font-medium">{s.handicapper.displayName}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{s.title}</div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
