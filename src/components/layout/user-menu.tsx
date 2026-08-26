"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  LineChart,
  LogOut,
  Settings,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCents } from "@/lib/utils";

export function UserMenu({
  name,
  username,
  image,
  role,
  walletBalance,
}: {
  name: string;
  username: string;
  image?: string | null;
  role: string;
  walletBalance: number;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none">
        <Avatar>
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="font-display text-sm text-foreground">{name}</span>
          <span className="text-xs text-muted-foreground">@{username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/wallet" className="justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="text-gold" /> Wallet
            </span>
            <span className="font-mono-num text-emerald-bright">
              {formatCents(walletBalance)}
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard /> Dashboard
          </Link>
        </DropdownMenuItem>
        {role === "HANDICAPPER" && (
          <DropdownMenuItem asChild>
            <Link href="/studio">
              <LineChart /> Handicapper Studio
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/account">
            <Settings /> Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
