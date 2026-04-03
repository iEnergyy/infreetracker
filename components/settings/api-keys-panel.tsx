"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  type ApiKeyListItem,
} from "@/app/app/settings/api-keys/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiKeysPanelProps {
  keys: ApiKeyListItem[];
}

export function ApiKeysPanel({ keys }: ApiKeysPanelProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokePending, setRevokePending] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const result = await createApiKeyAction(name);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setRevealedKey(result.plaintext);
    setName("");
    toast.success("API key created — copy it now; it will not be shown again.");
    router.refresh();
  }

  async function confirmRevoke() {
    if (!revokeId) return;
    setRevokePending(true);
    const result = await revokeApiKeyAction(revokeId);
    setRevokePending(false);
    setRevokeId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("API key revoked");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {revealedKey ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Your new API key</CardTitle>
            <CardDescription>
              Copy and store it securely. This is the only time the full key is shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <code className="bg-muted wrap-break-word rounded-md p-3 font-mono text-xs">
              {revealedKey}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={() => setRevealedKey(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create key</CardTitle>
          <CardDescription>Used as Bearer token for <code className="text-xs">/api/v1/*</code></CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="api-key-name">Label</Label>
              <Input
                id="api-key-name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production server"
                autoComplete="off"
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Your keys</h2>
        {keys.length === 0 ? (
          <p className="text-muted-foreground text-sm">No API keys yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Prefix</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell>
                    <code className="text-xs">{k.prefix}…</code>
                  </TableCell>
                  <TableCell>
                    {k.revokedAt ? (
                      <Badge variant="secondary">Revoked</Badge>
                    ) : (
                      <Badge>Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {k.revokedAt ? (
                      <span className="text-muted-foreground text-xs">—</span>
                    ) : (
                      <Button
                        type="button"
                        variant="destructive"
                        size="xs"
                        onClick={() => setRevokeId(k.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AlertDialog open={revokeId !== null} onOpenChange={(o) => !o && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
            <AlertDialogDescription>
              Requests using this key will return 401 immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokePending}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revokePending}
              onClick={() => void confirmRevoke()}
            >
              {revokePending ? "Revoking…" : "Revoke"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
