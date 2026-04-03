import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-svh">
      <header className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          Signed in as{" "}
          <span className="text-foreground font-medium">{session.user.email}</span>
        </p>
        <nav className="flex flex-wrap gap-1 text-sm">
          <Link
            href="/app"
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-md px-2 py-1 transition-colors",
            )}
          >
            Dashboard
          </Link>
          <Link
            href="/app/clients"
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-md px-2 py-1 transition-colors",
            )}
          >
            Clients
          </Link>
          <Link
            href="/app/settings/api-keys"
            className={cn(
              "text-muted-foreground hover:text-foreground rounded-md px-2 py-1 transition-colors",
            )}
          >
            API keys
          </Link>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
