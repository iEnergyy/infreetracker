import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { SubscriptionInvoiceRow } from "@/app/app/subscriptions/actions";

interface SubscriptionInvoiceTableProps {
  readonly invoices: SubscriptionInvoiceRow[];
}

export function SubscriptionInvoiceTable({ invoices }: SubscriptionInvoiceTableProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No invoices yet for this subscription.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Due date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid at</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-mono text-sm">{inv.dueDate}</TableCell>
            <TableCell>
              {inv.amount} {inv.currency}
            </TableCell>
            <TableCell>
              <Badge variant={inv.status === "paid" ? "secondary" : "outline"} className="capitalize">
                {inv.status}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
