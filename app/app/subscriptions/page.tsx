import Link from "next/link";
import { listClientsForSession } from "@/app/app/clients/actions";
import { listSubscriptionsForSession } from "@/app/app/subscriptions/actions";
import { SubscriptionList } from "@/components/subscriptions/subscription-list";
import { Button } from "@/components/ui/button";

export default async function SubscriptionsPage() {
  const [subscriptions, clients] = await Promise.all([
    listSubscriptionsForSession(),
    listClientsForSession(),
  ]);

  const hasClients = clients.length > 0;

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Subscriptions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Billing periods, first invoice on create, and client linkage.
          </p>
        </div>
        {hasClients && subscriptions.length > 0 ? (
          <Button asChild className="shrink-0 self-start sm:self-auto">
            <Link href="/app/subscriptions/new">New subscription</Link>
          </Button>
        ) : null}
      </div>
      <SubscriptionList subscriptions={subscriptions} hasClients={hasClients} />
    </div>
  );
}
