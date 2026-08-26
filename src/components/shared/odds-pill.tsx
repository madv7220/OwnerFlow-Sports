import { formatOdds } from "@/lib/utils";

export function OddsPill({ odds }: { odds: number }) {
  return (
    <span className="font-mono-num inline-flex items-center rounded-md bg-surface-3 px-2 py-0.5 text-xs font-semibold text-foreground">
      {formatOdds(odds)}
    </span>
  );
}
