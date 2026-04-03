"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { generateNextInvoiceForSubscriptionAction } from "@/app/app/subscriptions/actions";
import { Button } from "@/components/ui/button";

interface SubscriptionGenerateInvoicesButtonProps {
  readonly subscriptionId: string;
  readonly disabled?: boolean;
}

export function SubscriptionGenerateInvoicesButton({
  subscriptionId,
  disabled = false,
}: SubscriptionGenerateInvoicesButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await generateNextInvoiceForSubscriptionAction(subscriptionId);
    setPending(false);
    if (!result.ok) {
      toast.error(result.formError);
      return;
    }
    if (result.created) {
      toast.success("Next invoice generated");
    } else {
      toast.message("No new invoice", {
        description: "Current period already has an open invoice, or nothing to advance yet.",
      });
    }
    router.refresh();
  }

  return (
    <Button type="button" variant="secondary" disabled={disabled || pending} onClick={onClick}>
      {pending ? "Generating…" : "Generate now"}
    </Button>
  );
}
