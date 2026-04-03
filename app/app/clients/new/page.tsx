import Link from "next/link";
import { ClientCreateForm } from "@/components/clients/client-create-form";
import { Button } from "@/components/ui/button";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/app/clients">← Back to clients</Link>
        </Button>
        <h1 className="text-lg font-medium">Create client</h1>
      </div>
      <ClientCreateForm />
    </div>
  );
}
