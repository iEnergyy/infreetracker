import { Badge } from "@/components/ui/badge";

interface SubscriptionStatusBadgeProps {
  readonly status: "active" | "grace" | "overdue" | "blocked";
}

export function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const variant =
    status === "active"
      ? "secondary"
      : status === "grace"
        ? "outline"
        : "destructive";

  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}
