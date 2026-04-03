import Link from "next/link";
import { listClientsForSession } from "@/app/app/clients/actions";
import { ClientList } from "@/components/clients/client-list";
import { Button } from "@/components/ui/button";

export default async function ClientsPage() {
  const clients = await listClientsForSession();

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-medium">Clients</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage clients for subscriptions and API access.</p>
        </div>
        {clients.length > 0 ? (
          <Button asChild className="shrink-0 self-start sm:self-auto">
            <Link href="/app/clients/new">New client</Link>
          </Button>
        ) : null}
      </div>
      <ClientList clients={clients} />
    </div>
  );
}
