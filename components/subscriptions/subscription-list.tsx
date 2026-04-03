"use client";

import Link from "next/link";
import type { SubscriptionListItem } from "@/app/app/subscriptions/actions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SubscriptionStatusBadge } from "@/components/subscriptions/subscription-status-badge";

interface SubscriptionListProps {
  readonly subscriptions: SubscriptionListItem[];
  readonly hasClients: boolean;
}

function cycleLabel(cycle: string, billingIntervalDays: number | null): string {
  if (cycle === "monthly") return "Monthly";
  return `Every ${billingIntervalDays ?? "—"} days`;
}

export function SubscriptionList({ subscriptions, hasClients }: SubscriptionListProps) {
  if (!hasClients) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-8">
        <div className="flex flex-col gap-1">
          <p className="font-medium">Add a client first</p>
          <p className="text-muted-foreground text-sm">
            Subscriptions are linked to a client. Create a client, then add a subscription.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/clients/new">Create client</Link>
        </Button>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-8">
        <div className="flex flex-col gap-1">
          <p className="font-medium">No subscriptions yet</p>
          <p className="text-muted-foreground text-sm">
            Create a subscription to generate the first invoice for a billing period.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/subscriptions/new">New subscription</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button asChild>
          <Link href="/app/subscriptions/new">New subscription</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Grace</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subscriptions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link className="hover:underline" href={`/app/clients/${s.clientId}`}>
                  {s.clientName}
                </Link>
              </TableCell>
              <TableCell>
                {s.amount} {s.currency}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {cycleLabel(s.billingCycle, s.billingIntervalDays)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">{s.gracePeriodDays}d</TableCell>
              <TableCell>
                <SubscriptionStatusBadge
                  status={s.status as "active" | "grace" | "overdue" | "blocked"}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/app/subscriptions/${s.id}`}>Open</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
