"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { SubscriptionDetail } from "@/app/app/subscriptions/actions";
import { updateSubscriptionAction } from "@/app/app/subscriptions/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SubscriptionEditFormProps {
  readonly subscription: SubscriptionDetail;
}

export function SubscriptionEditForm({ subscription: sub }: SubscriptionEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);

    setPending(true);
    const payload: Record<string, unknown> = {
      subscriptionId: sub.id,
      amount: fd.get("amount"),
      gracePeriodDays: fd.get("gracePeriodDays"),
    };
    if (sub.billingCycle === "custom_days") {
      payload.billingIntervalDays = fd.get("billingIntervalDays");
    }

    const result = await updateSubscriptionAction(payload);
    setPending(false);

    if (!result.ok) {
      if (result.formError) setFormError(result.formError);
      setFieldErrors(result.fieldErrors);
      return;
    }

    toast.success("Subscription updated");
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">Edit subscription</CardTitle>
        <CardDescription>
          Amount changes apply to the next generated invoice only; existing invoices are not rewritten (MVP).
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="flex flex-col gap-4">
          {formError ? (
            <p className="text-destructive text-sm" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              defaultValue={sub.amount}
              aria-invalid={!!fieldErrors.amount}
            />
            {fieldErrors.amount?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.amount[0]}</p>
            ) : null}
          </div>

          {sub.billingCycle === "custom_days" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="billingIntervalDays">Interval (days)</Label>
              <Input
                id="billingIntervalDays"
                name="billingIntervalDays"
                type="number"
                min={1}
                step={1}
                required
                defaultValue={sub.billingIntervalDays ?? 1}
                aria-invalid={!!fieldErrors.billingIntervalDays}
              />
              {fieldErrors.billingIntervalDays?.[0] ? (
                <p className="text-destructive text-xs">{fieldErrors.billingIntervalDays[0]}</p>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="gracePeriodDays">Grace period (days)</Label>
            <Input
              id="gracePeriodDays"
              name="gracePeriodDays"
              type="number"
              min={0}
              step={1}
              required
              defaultValue={sub.gracePeriodDays}
              aria-invalid={!!fieldErrors.gracePeriodDays}
            />
            <p className="text-muted-foreground text-xs">
              Applies to future enforcement runs from save time forward.
            </p>
            {fieldErrors.gracePeriodDays?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.gracePeriodDays[0]}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
