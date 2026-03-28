import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  getBetterAuthSecret,
  getBetterAuthUrl,
  getTrustedOrigins,
} from "@/lib/env";

const isProduction = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  baseURL: getBetterAuthUrl(),
  secret: getBetterAuthSecret(),
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // MVP: no verification email configured — users can sign in immediately.
    // When you add `emailVerification.sendVerificationEmail`, set
    // `requireEmailVerification: true` for stricter flows + enumeration-safe sign-up.
  },
  advanced: {
    useSecureCookies: isProduction,
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: isProduction,
    },
  },
  plugins: [nextCookies()],
});
