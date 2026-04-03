"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { InvoiceDetailForSession } from "@/app/app/invoices/actions";
import { recordInvoicePaymentAction } from "@/app/app/invoices/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHODS } from "@/lib/validation/payments";

interface InvoiceMarkPaidFormProps {
  readonly invoice: InvoiceDetailForSession;
}

const METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  other: "Other",
};

export function InvoiceMarkPaidForm({ invoice }: InvoiceMarkPaidFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [method, setMethod] = useState<(typeof PAYMENT_METHODS)[number] | "">("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (invoice.status !== "pending" && invoice.status !== "overdue") {
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!method) {
      setFormError("Select a payment method");
      return;
    }
    setPending(true);
    const result = await recordInvoicePaymentAction({
      invoiceId: invoice.id,
      method,
      note: note.trim() || null,
    });
    setPending(false);
    if (!result.ok) {
      if (result.formError) setFormError(result.formError);
      toast.error(result.formError ?? "Could not record payment");
      return;
    }
    toast.success("Payment recorded");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record payment</CardTitle>
        <CardDescription>Full amount only ({invoice.amount} {invoice.currency}).</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="method">Method</Label>
            <Select
              value={method || undefined}
              onValueChange={(v) => setMethod(v as (typeof PAYMENT_METHODS)[number])}
            >
              <SelectTrigger id="method" className="w-full sm:max-w-xs">
                <SelectValue placeholder="Choose method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="resize-none"
              placeholder="Reference, receipt #, …"
            />
          </div>
          {formError ? <p className="text-destructive text-sm">{formError}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Mark paid"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
