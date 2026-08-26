import Link from "next/link";
import { Radio } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Logo } from "@/components/layout/logo";
import { NAV_LINKS } from "@/components/layout/nav-links";
import { NavSearch } from "@/components/layout/nav-search";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function Navbar() {
  const session = await auth();

  const [liveCount, user] = await Promise.all([
    prisma.stream.count({ where: { status: "LIVE" } }),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { walletBalance: true, avatarUrl: true },
        })
      : null,
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <MobileNav isAuthed={!!session} />
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Button key={link.href} asChild variant="ghost" size="sm" className="gap-1.5 font-medium">
              <Link href={link.href}>
                {link.href === "/live" && liveCount > 0 && (
                  <span className="live-dot inline-block size-1.5 rounded-full bg-crimson" />
                )}
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <NavSearch />
          {liveCount > 0 && (
            <Link href="/live">
              <Badge variant="live" className="hidden sm:inline-flex">
                <Radio className="size-3" /> {liveCount} LIVE
              </Badge>
            </Link>
          )}
          {session?.user ? (
            <UserMenu
              name={session.user.name ?? session.user.username}
              username={session.user.username}
              image={user?.avatarUrl}
              role={session.user.role}
              walletBalance={user?.walletBalance ?? 0}
            />
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Join OwnerFlow</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
