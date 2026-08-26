import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "WON":
      return <Badge variant="emerald">Won</Badge>;
    case "LOST":
      return <Badge variant="crimson">Lost</Badge>;
    case "PUSH":
      return <Badge variant="secondary">Push</Badge>;
    default:
      return <Badge variant="default">Pending</Badge>;
  }
}
