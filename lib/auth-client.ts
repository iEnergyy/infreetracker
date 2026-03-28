import { createAuthClient } from "better-auth/react";

/** Same-origin `/api/auth` — set `NEXT_PUBLIC_APP_URL` only if the client is served from another origin. */
export const authClient = createAuthClient();
