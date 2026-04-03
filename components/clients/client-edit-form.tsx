"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteClientAction,
  updateClientAction,
  type ClientDetail,
} from "@/app/app/clients/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClientEditFormProps {
  client: ClientDetail;
}

export function ClientEditForm({ client }: ClientEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const result = await updateClientAction({
      clientId: client.id,
      name: fd.get("name"),
      contact: fd.get("contact"),
      notes: fd.get("notes"),
    });
    setPending(false);

    if (!result.ok) {
      if (result.formError) setFormError(result.formError);
      setFieldErrors(result.fieldErrors);
      return;
    }

    toast.success("Client updated");
    router.refresh();
  }

  async function onDelete() {
    setDeletePending(true);
    const result = await deleteClientAction(client.id);
    setDeletePending(false);
    setDeleteOpen(false);

    if (!result.ok) {
      toast.error(result.formError);
      return;
    }

    toast.success("Client deleted");
    router.push("/app/clients");
    router.refresh();
  }

  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Edit client</CardTitle>
          <CardDescription>External ID cannot be changed.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            {formError ? (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="flex flex-col gap-2">
              <Label htmlFor="externalId">External ID</Label>
              <Input id="externalId" value={client.externalId} disabled readOnly className="font-mono text-xs" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={client.name}
                autoComplete="organization"
                aria-invalid={!!fieldErrors.name}
              />
              {fieldErrors.name?.[0] ? (
                <p className="text-destructive text-xs">{fieldErrors.name[0]}</p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="contact">Contact (optional)</Label>
              <Input
                id="contact"
                name="contact"
                defaultValue={client.contact ?? ""}
                placeholder="WhatsApp / phone"
                autoComplete="tel"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={client.notes ?? ""} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save changes"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/clients">Back to list</Link>
              </Button>
            </div>
            <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete client
            </Button>
          </CardFooter>
        </form>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. You can only delete clients that have no subscriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={() => void onDelete()}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
