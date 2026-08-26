import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function formatOdds(odds: number) {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

export function americanToPayout(odds: number, stakeCents: number) {
  if (odds > 0) return Math.round(stakeCents * (odds / 100));
  return Math.round(stakeCents * (100 / Math.abs(odds)));
}

export function combineParlayOdds(oddsList: number[]) {
  const decimal = oddsList.reduce((acc, odds) => {
    const d = odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
    return acc * d;
  }, 1);
  const american =
    decimal >= 2 ? Math.round((decimal - 1) * 100) : Math.round(-100 / (decimal - 1));
  return american;
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
