import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { account, session, user, verification } from "./auth";

/**
 * Drizzle schema entrypoint. Auth tables match Better Auth (`user`, `session`, `account`, `verification`).
 *
 * **Domain rule:** any future `user_id` column must reference `user.id` (text) — same type Better Auth uses.
 */
export * from "./auth";

export type UserRow = InferSelectModel<typeof user>;
export type UserInsert = InferInsertModel<typeof user>;
export type SessionRow = InferSelectModel<typeof session>;
export type SessionInsert = InferInsertModel<typeof session>;
export type AccountRow = InferSelectModel<typeof account>;
export type AccountInsert = InferInsertModel<typeof account>;
export type VerificationRow = InferSelectModel<typeof verification>;
export type VerificationInsert = InferInsertModel<typeof verification>;
