import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InvoicePaymentRow } from "@/app/app/invoices/actions";

interface InvoicePaymentsTableProps {
  readonly payments: InvoicePaymentRow[];
}

export function InvoicePaymentsTable({ payments }: InvoicePaymentsTableProps) {
  if (payments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No payments recorded for this invoice yet.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recorded</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Note</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(p.recordedAt).toLocaleString()}
            </TableCell>
            <TableCell className="capitalize">{p.method.replace(/_/g, " ")}</TableCell>
            <TableCell className="font-mono text-sm">{p.amount}</TableCell>
            <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
              {p.note ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
