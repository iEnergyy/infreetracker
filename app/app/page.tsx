import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export default async function AppHomePage() {
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Session user id (use for scoping queries):{" "}
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
            {session.user.id}
          </code>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="secondary">
          <Link href="/app/clients">Clients</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/app/subscriptions">Subscriptions</Link>
        </Button>
        <SignOutButton />
      </div>
    </div>
  );
}
