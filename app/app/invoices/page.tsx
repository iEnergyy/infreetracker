import { listInvoicesForSession } from "@/app/app/invoices/actions";
import { InvoiceListTable } from "@/components/invoices/invoice-list-table";

export default async function InvoicesPage() {
  const invoices = await listInvoicesForSession();

  return (
    <div className="mx-auto max-w-5xl flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Invoices</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All invoices across your subscriptions. Open one to record a payment or see history.
        </p>
      </div>
      <InvoiceListTable invoices={invoices} />
    </div>
  );
}
