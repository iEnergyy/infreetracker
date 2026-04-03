import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceForSession } from "@/app/app/invoices/actions";
import { InvoiceMarkPaidForm } from "@/components/invoices/invoice-mark-paid-form";
import { InvoicePaymentsTable } from "@/components/invoices/invoice-payments-table";
import { SubscriptionStatusBadge } from "@/components/subscriptions/subscription-status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const inv = await getInvoiceForSession(id);
  if (!inv) notFound();

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-8 p-6">
      <div className="flex flex-col gap-2">
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link
            href="/app/invoices"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← All invoices
          </Link>
          <Link
            href={`/app/subscriptions/${inv.subscriptionId}`}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Subscription
          </Link>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-medium">Invoice</h1>
          <Badge variant={inv.status === "paid" ? "secondary" : "outline"} className="capitalize">
            {inv.status}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Client:{" "}
          <Link className="text-foreground font-medium hover:underline" href={`/app/clients/${inv.clientId}`}>
            {inv.clientName}
          </Link>{" "}
          <code className="text-muted-foreground text-xs">({inv.clientExternalId})</code>
          {" · "}
          <Link
            className="text-foreground font-medium hover:underline"
            href={`/app/subscriptions/${inv.subscriptionId}`}
          >
            Subscription
          </Link>{" "}
          <SubscriptionStatusBadge status={inv.subscriptionStatus as "active" | "grace" | "overdue" | "blocked"} />
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-mono font-medium">{inv.dueDate}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Amount</p>
            <p className="font-medium">
              {inv.amount} {inv.currency}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="text-muted-foreground text-xs">{new Date(inv.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Paid at</p>
            <p className="text-muted-foreground text-xs">
              {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm leading-relaxed">
        After this invoice is paid, the next period invoice is created when the daily job runs or when you use{" "}
        <strong>Generate now</strong> on the{" "}
        <Link href={`/app/subscriptions/${inv.subscriptionId}`} className="text-foreground underline">
          subscription
        </Link>
        .
      </p>

      <InvoiceMarkPaidForm invoice={inv} />

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Payments</h2>
        <InvoicePaymentsTable payments={inv.payments} />
      </div>
    </div>
  );
}
