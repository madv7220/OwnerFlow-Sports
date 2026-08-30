import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const columns = [
  {
    title: "Platform",
    links: [
      { href: "/scores", label: "Scores & Odds" },
      { href: "/feed", label: "Live Feed" },
      { href: "/picks", label: "Picks & Parlays" },
      { href: "/handicappers", label: "Handicappers" },
      { href: "/live", label: "Live Streams" },
    ],
  },
  {
    title: "Membership",
    links: [
      { href: "/pricing", label: "Plans & Pricing" },
      { href: "/register?role=HANDICAPPER", label: "Sell Your Picks" },
      { href: "/dashboard", label: "My Dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About OwnerFlow" },
      { href: "/responsible-play", label: "Responsible Play" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/80 bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            The research desk and marketplace for serious sports bettors. Vetted
            handicappers, transparent records, real-time analysis.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title} className="flex flex-col gap-3">
            <h4 className="font-display text-sm tracking-wide text-gold-bright">
              {col.title}
            </h4>
            <ul className="flex flex-col gap-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/80 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} OwnerFlow Sports. For entertainment and research purposes. 21+.</p>
          <p>If you or someone you know has a gambling problem, call 1-800-GAMBLER.</p>
        </div>
      </div>
    </footer>
  );
}
