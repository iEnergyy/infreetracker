import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InvoiceListItem } from "@/app/app/invoices/actions";

interface InvoiceListTableProps {
  readonly invoices: InvoiceListItem[];
}

export function InvoiceListTable({ invoices }: InvoiceListTableProps) {
  if (invoices.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No invoices yet. They appear when you create a subscription or when billing generates the next
        period.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Due date</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-end">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((inv) => (
          <TableRow key={inv.id}>
            <TableCell className="font-mono text-sm">{inv.dueDate}</TableCell>
            <TableCell>
              <Link
                href={`/app/clients/${inv.clientId}`}
                className="text-foreground hover:underline"
              >
                {inv.clientName}
              </Link>
            </TableCell>
            <TableCell>
              {inv.amount} {inv.currency}
            </TableCell>
            <TableCell>
              <Badge variant={inv.status === "paid" ? "secondary" : "outline"} className="capitalize">
                {inv.status}
              </Badge>
            </TableCell>
            <TableCell className="text-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/invoices/${inv.id}`}>View invoice</Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
