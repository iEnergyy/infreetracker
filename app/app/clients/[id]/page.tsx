import Link from "next/link";
import { notFound } from "next/navigation";
import { getClientForSession } from "@/app/app/clients/actions";
import { ClientEditForm } from "@/components/clients/client-edit-form";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const client = await getClientForSession(id);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/app/clients">← Back to clients</Link>
        </Button>
        <h1 className="text-lg font-medium">{client.name}</h1>
      </div>
      <ClientEditForm client={client} />
    </div>
  );
}
