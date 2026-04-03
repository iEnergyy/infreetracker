"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ClientSummary } from "@/app/app/clients/actions";
import { createSubscriptionAction } from "@/app/app/subscriptions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SubscriptionCreateFormProps {
  readonly clients: ClientSummary[];
}

export function SubscriptionCreateForm({ clients }: SubscriptionCreateFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [clientId, setClientId] = useState<string>("");
  const [currency, setCurrency] = useState<"DOP" | "USD">("USD");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "custom_days">("monthly");

  if (clients.length === 0) {
    return (
      <Card className="max-w-lg border-dashed">
        <CardHeader>
          <CardTitle className="text-base">No clients yet</CardTitle>
          <CardDescription>Add a client before creating a subscription.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/app/clients/new">Create client</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);

    setPending(true);
    const result = await createSubscriptionAction({
      clientId: clientId || fd.get("clientId"),
      amount: fd.get("amount"),
      currency,
      billingCycle,
      billingIntervalDays:
        billingCycle === "custom_days" ? fd.get("billingIntervalDays") : undefined,
      startDate: fd.get("startDate"),
      gracePeriodDays: fd.get("gracePeriodDays"),
    });
    setPending(false);

    if (!result.ok) {
      if (result.formError) setFormError(result.formError);
      setFieldErrors(result.fieldErrors);
      return;
    }

    toast.success("Subscription created");
    router.push(`/app/subscriptions/${result.subscriptionId}`);
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">New subscription</CardTitle>
        <CardDescription>
          The first invoice is created with due date on the first period end. Client and start date cannot be
          changed here after save (MVP).
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {formError ? (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          ) : null}
          <input type="hidden" name="clientId" value={clientId} />

          <div className="flex flex-col gap-2">
            <Label>Client</Label>
            <Select value={clientId || undefined} onValueChange={setClientId} required>
              <SelectTrigger aria-invalid={!!fieldErrors.clientId} className="w-full">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}{" "}
                    <span className="text-muted-foreground">({c.externalId})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.clientId?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.clientId[0]}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              placeholder="0.00"
              autoComplete="off"
              aria-invalid={!!fieldErrors.amount}
            />
            {fieldErrors.amount?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.amount[0]}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as "DOP" | "USD")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="DOP">DOP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Billing cycle</Label>
            <Select
              value={billingCycle}
              onValueChange={(v) => setBillingCycle(v as "monthly" | "custom_days")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom_days">Custom (every N days)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {billingCycle === "custom_days" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="billingIntervalDays">Interval (days)</Label>
              <Input
                id="billingIntervalDays"
                name="billingIntervalDays"
                type="number"
                min={1}
                step={1}
                required={billingCycle === "custom_days"}
                aria-invalid={!!fieldErrors.billingIntervalDays}
              />
              {fieldErrors.billingIntervalDays?.[0] ? (
                <p className="text-destructive text-xs">{fieldErrors.billingIntervalDays[0]}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              required
              aria-invalid={!!fieldErrors.startDate}
            />
            {fieldErrors.startDate?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.startDate[0]}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
            <Input
              id="gracePeriodDays"
              name="gracePeriodDays"
              type="number"
              min={0}
              step={1}
              defaultValue={0}
              aria-invalid={!!fieldErrors.gracePeriodDays}
            />
            <p className="text-muted-foreground text-xs">
              Used when enforcement runs (Phase 10). Changing this only affects future checks.
            </p>
            {fieldErrors.gracePeriodDays?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.gracePeriodDays[0]}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || !clientId}>
            {pending ? "Saving…" : "Create subscription"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/subscriptions">Cancel</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
