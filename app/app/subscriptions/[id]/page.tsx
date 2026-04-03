import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubscriptionForSession } from "@/app/app/subscriptions/actions";
import { SubscriptionEditForm } from "@/components/subscriptions/subscription-edit-form";
import { SubscriptionGenerateInvoicesButton } from "@/components/subscriptions/subscription-generate-invoices-button";
import { SubscriptionInvoiceTable } from "@/components/subscriptions/subscription-invoice-table";
import { SubscriptionStatusBadge } from "@/components/subscriptions/subscription-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

function cycleLabel(
  cycle: "monthly" | "custom_days",
  billingIntervalDays: number | null,
): string {
  if (cycle === "monthly") return "Monthly";
  return `Every ${billingIntervalDays ?? "—"} days`;
}

export default async function SubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const sub = await getSubscriptionForSession(id);
  if (!sub) notFound();

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/app/subscriptions">← Back to subscriptions</Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-medium">Subscription</h1>
          <SubscriptionStatusBadge status={sub.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Client:{" "}
          <Link className="text-foreground font-medium hover:underline" href={`/app/clients/${sub.clientId}`}>
            {sub.clientName}
          </Link>{" "}
          <code className="text-muted-foreground text-xs">({sub.clientExternalId})</code>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">
              {sub.amount} {sub.currency}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Billing cycle</p>
            <p className="font-medium">{cycleLabel(sub.billingCycle, sub.billingIntervalDays)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Grace period</p>
            <p className="font-medium">{sub.gracePeriodDays} days</p>
          </div>
          <div>
            <p className="text-muted-foreground">Start date</p>
            <p className="font-mono font-medium">{sub.startDate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current period end</p>
            <p className="font-mono text-xs font-medium">{sub.currentPeriodEnd}</p>
          </div>
          {sub.blockedAt ? (
            <div>
              <p className="text-muted-foreground">Blocked at</p>
              <p className="font-mono text-xs font-medium">{sub.blockedAt}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice generation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="text-muted-foreground">Last generated</p>
            <p className="font-mono text-xs font-medium">
              {sub.lastInvoiceCreatedAt ?? "—"}
            </p>
          </div>
          <SubscriptionGenerateInvoicesButton
            subscriptionId={sub.id}
            disabled={sub.status === "blocked"}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-medium">Invoices</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Use <span className="text-foreground font-medium">View</span> or the due date to open the full
            invoice (record payment, payments list). You can also browse all invoices from{" "}
            <Link href="/app/invoices" className="text-foreground underline">
              Invoices
            </Link>{" "}
            in the header.
          </p>
        </div>
        <SubscriptionInvoiceTable invoices={sub.invoices} />
      </div>

      <SubscriptionEditForm subscription={sub} />
    </div>
  );
}
