"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createClientAction } from "@/app/app/clients/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ClientCreateForm() {
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
    const result = await createClientAction({
      name: fd.get("name"),
      externalId: fd.get("externalId"),
      contact: fd.get("contact"),
      notes: fd.get("notes"),
    });
    setPending(false);

    if (!result.ok) {
      if (result.formError) setFormError(result.formError);
      setFieldErrors(result.fieldErrors);
      return;
    }

    toast.success("Client created");
    router.push(`/app/clients/${result.clientId}`);
    router.refresh();
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="text-base">New client</CardTitle>
        <CardDescription>
          <code className="text-xs">external_id</code> is permanent and used by the public API.
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
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required autoComplete="organization" aria-invalid={!!fieldErrors.name} />
            {fieldErrors.name?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.name[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="externalId">External ID</Label>
            <Input
              id="externalId"
              name="externalId"
              required
              placeholder="e.g. acme-corp"
              autoComplete="off"
              aria-invalid={!!fieldErrors.externalId}
            />
            {fieldErrors.externalId?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.externalId[0]}</p>
            ) : (
              <p className="text-muted-foreground text-xs">Lowercase letters, numbers, and hyphens only.</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contact">Contact (optional)</Label>
            <Input id="contact" name="contact" placeholder="WhatsApp / phone" autoComplete="tel" />
            {fieldErrors.contact?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.contact[0]}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" name="notes" rows={3} />
            {fieldErrors.notes?.[0] ? (
              <p className="text-destructive text-xs">{fieldErrors.notes[0]}</p>
            ) : null}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create client"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/app/clients">Cancel</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
