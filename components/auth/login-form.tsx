"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setMessage(null);
    setPending(true);
    const { error } = await authClient.signIn.email(
      { email, password },
      {
        onSuccess: () => {
          router.push("/app");
          router.refresh();
        },
      },
    );
    setPending(false);
    if (error) {
      setMessage(
        error.message ||
          "Could not sign in. Check your email and password and try again.",
      );
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your email and password.</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          {message ? (
            <p
              className="text-destructive text-sm"
              role="alert"
            >
              {message}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            type="submit"
            disabled={pending}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <Button
            variant="link"
            className="text-muted-foreground px-0"
            asChild
          >
            <Link href="/register">Create an account</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
