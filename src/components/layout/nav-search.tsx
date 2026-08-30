"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function NavSearch() {
  const router = useRouter();

  return (
    <form
      className="relative hidden 2xl:block"
      onSubmit={(e) => {
        e.preventDefault();
        const q = new FormData(e.currentTarget).get("q");
        if (typeof q === "string" && q.trim()) {
          router.push(`/search?q=${encodeURIComponent(q.trim())}`);
        }
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        placeholder="Search picks, handicappers, teams…"
        className="h-9 w-56 rounded-full border border-border bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-gold focus:ring-1 focus:ring-gold"
      />
    </form>
  );
}
