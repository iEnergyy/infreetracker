import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col gap-8 p-6">
      <div className="flex max-w-lg flex-col gap-3">
        <h1 className="text-lg font-medium">CobroFlow</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Billing and subscription enforcement for freelancers. Sign in to open the dashboard, or use
          the protected API route to verify your session cookie.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button
            variant="outline"
            asChild
          >
            <Link href="/register">Register</Link>
          </Button>
          <Button
            variant="secondary"
            asChild
          >
            <Link href="/app">Dashboard</Link>
          </Button>
        </div>
      </div>
      <p className="text-muted-foreground font-mono text-xs">
        Test route: <code className="bg-muted rounded px-1">GET /api/protected/me</code> → 401 without
        session, 200 with session.
      </p>
    </div>
  );
}
