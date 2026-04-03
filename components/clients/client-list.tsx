"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ClientSummary } from "@/app/app/clients/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientListProps {
  readonly clients: ClientSummary[];
}

export function ClientList({ clients: allClients }: ClientListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allClients;
    return allClients.filter((c) => c.name.toLowerCase().includes(q));
  }, [allClients, query]);

  if (allClients.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-8">
        <div className="flex flex-col gap-1">
          <p className="font-medium">No clients yet</p>
          <p className="text-muted-foreground text-sm">
            Add a client to link subscriptions, invoices, and API access.
          </p>
        </div>
        <Button asChild>
          <Link href="/app/clients/new">Create client</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
          aria-label="Filter clients by name"
        />
        <Button asChild>
          <Link href="/app/clients/new">New client</Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>External ID</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead className="text-right"> </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground h-16 text-center text-sm">
                No clients match your search.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <code className="text-xs">{c.externalId}</code>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate text-sm">
                  {c.contact ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/app/clients/${c.id}`}>Open</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
