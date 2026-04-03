# CobroFlow — Technical roadmap & build spec

Product context → **[README.md](./README.md)**.

This document splits work into **microphases**. Each microphase has explicit **acceptance criteria (ACs)**. Order is recommended; some microphases can run in parallel where noted.

**Conventions**

- **AC** = testable condition (manual QA or automated).
- **Owner** = single user tenant (no teams in MVP); `user_id` on all domain rows.
- **Dashboard** = Better Auth session; **v1 API** = API key Bearer token.

---

## 0. Stack reference

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router) + shadcn/ui |
| Auth | **Better Auth** (session for app UI; Drizzle adapter) |
| Backend | Next.js Route Handlers (+ optional Hono mount) |
| Database | PostgreSQL + Drizzle ORM + migrations |
| Jobs | Vercel Cron (or equivalent) + secured job route |
| External API | Bearer API keys (per user), separate from Better Auth session |

---

## 1. Foundation & tooling

### 1.1 — Repo, env, database connectivity

**Scope:** `.env` validation, single Postgres URL, Drizzle config, `db:push` / migrate script documented.

**ACs**

- [x] **AC-1.1.1** Documented env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (or app URL), plus any email provider vars if magic link enabled.
- [x] **AC-1.1.2** `pnpm`/`npm` script runs Drizzle migrations (or generate + migrate) without error against empty DB.
- [x] **AC-1.1.3** README or internal doc lists how to spin local Postgres (Docker one-liner acceptable).

---

### 1.2 — Drizzle schema baseline & `users` alignment

**Scope:** Initialize Drizzle; ensure app-owned tables coexist with Better Auth tables (same DB). No duplicate user table if Better Auth creates `user` — link domain tables via Better Auth user id (string/uuid per Better Auth schema).

**ACs**

- [x] **AC-1.2.1** Drizzle schema file(s) committed; types export for insert/select where used.
- [x] **AC-1.2.2** Migration applies cleanly on fresh DB after Better Auth tables exist (order: run Better Auth migrations or use generated schema from Better Auth docs).
- [x] **AC-1.2.3** Documented rule: all `user_id` FKs reference Better Auth `user.id` type.

---

## 2. Better Auth

### 2.1 — Better Auth server instance

**Scope:** `auth` export from `lib/auth.ts` (or project convention), Drizzle adapter, Postgres provider, session cookie settings for Next.js.

**ACs**

- [x] **AC-2.1.1** Better Auth handler mounted at documented path (e.g. `/api/auth/[...all]`).
- [x] **AC-2.1.2** Session creation persists in DB per Better Auth + Drizzle docs.
- [x] **AC-2.1.3** Invalid session returns 401 on a protected test route.

---

### 2.2 — Sign-up / sign-in flows (MVP)

**Scope:** At minimum **email + password** OR **magic link** (pick one for MVP; second can be phase 1.5). Email verification policy documented (required vs optional).

**ACs**

- [x] **AC-2.2.1** New user can register and land in authenticated state (session cookie set).
- [x] **AC-2.2.2** Sign-out clears session; subsequent dashboard request redirects to sign-in.
- [x] **AC-2.2.3** Wrong password / invalid magic link shows safe error (no user enumeration if policy requires).
- [x] **AC-2.2.4** Password policy documented (min length, etc.) and enforced by Better Auth config.

---

### 2.3 — Client auth helper (RSC + Route Handlers)

**Scope:** `getSession()` (or Better Auth `auth.api.getSession`) usable in Server Components and API routes; middleware or layout guard for `/app/*` (or chosen prefix).

**ACs**

- [x] **AC-2.3.1** Unauthenticated access to any dashboard route redirects to `/login` (or chosen path).
- [x] **AC-2.3.2** Authenticated user hitting `/login` redirects to dashboard (optional AC).
- [x] **AC-2.3.3** Session user `id` available in server code for scoping queries.

---

### 2.4 — CSRF / cookie security (production checklist)

**Scope:** `trustedOrigins`, `secure` cookies in prod, `sameSite` appropriate.

**ACs**

- [x] **AC-2.4.1** Production deploy uses HTTPS-only session cookies.
- [x] **AC-2.4.2** Better Auth `baseURL` matches deployed origin to avoid cookie mismatch.

---

## 3. Core schema (domain)

### 3.1 — Table `clients`

**Columns (minimum):** `id`, `user_id`, `name`, `contact` (WhatsApp), `external_id` (unique per `user_id`), `notes`, `created_at`, `updated_at`.

**ACs**

- [x] **AC-3.1.1** Unique constraint on (`user_id`, `external_id`).
- [x] **AC-3.1.2** `external_id` format validated (e.g. slug alphanumeric + hyphen; document regex).
- [x] **AC-3.1.3** Cascade or restrict: deleting user is undefined for MVP — document “manual cleanup” or soft-delete later.

---

### 3.2 — Table `subscriptions`

**Columns:** `id`, `user_id`, `client_id`, `amount` (numeric), `currency` (enum `DOP`|`USD`), `billing_cycle` (enum e.g. `monthly` | `custom_days`), `billing_interval_days` (nullable if monthly), `start_date`, `grace_period_days`, `status` (`active`|`grace`|`overdue`|`blocked`), `current_period_end` or equivalent, `blocked_at`, `created_at`, `updated_at`.

**ACs**

- [x] **AC-3.2.1** `client_id` FK to `clients`; row only visible to owning `user_id`.
- [x] **AC-3.2.2** `grace_period_days` ≥ 0; `amount` > 0.
- [x] **AC-3.2.3** If `billing_cycle = custom_days`, `billing_interval_days` required and ≥ 1.

---

### 3.3 — Table `invoices`

**Columns:** `id`, `user_id`, `subscription_id`, `amount`, `currency`, `due_date`, `status` (`pending`|`paid`|`overdue`), `paid_at` (nullable), `created_at`, `updated_at`.

**ACs**

- [x] **AC-3.3.1** Invoice `user_id` matches parent subscription’s user (enforced in app or trigger).
- [x] **AC-3.3.2** Index on (`subscription_id`, `due_date`) for cron and listing.

---

### 3.4 — Table `payments`

**Columns:** `id`, `user_id`, `invoice_id`, `amount`, `method` (enum or text), `note`, `recorded_at`, `created_at`.

**ACs**

- [x] **AC-3.4.1** Payment `amount` matches invoice `amount` OR document partial payments policy (MVP: full pay only simplifies AC).
- [ ] **AC-3.4.2** Recording payment sets invoice `status = paid` and `paid_at` in same transaction.

---

### 3.5 — Table `costs`

**Columns:** `id`, `user_id`, `client_id`, `category` (enum: `hosting`|`api`|`domain`|…), `amount`, `currency`, `period_start`, `period_end` or `billing_month`, `note`, `created_at`.

**ACs**

- [x] **AC-3.5.1** Costs listable and aggregatable per `client_id` per month.
- [x] **AC-3.5.2** `amount` ≥ 0.

---

### 3.6 — Table `api_keys`

**Columns:** `id`, `user_id`, `name`, `key_hash` (never store plain key after creation), `prefix` (first 8 chars for display), `created_at`, `revoked_at` (nullable).

**ACs**

- [ ] **AC-3.6.1** Plain key shown once on create; verify via hash on each v1 request.
- [ ] **AC-3.6.2** Revoked keys return 401.

---

### 3.7 — Tables `webhook_endpoints` + `webhook_deliveries` (MVP)

**webhook_endpoints:** `id`, `user_id`, `url`, `secret` (for signing), `events` (json array of event names), `enabled`, `created_at`.

**webhook_deliveries:** `id`, `endpoint_id`, `event_type`, `payload`, `status`, `attempts`, `last_error`, `created_at` (for retries/debug).

**ACs**

- [ ] **AC-3.7.1** URL must be HTTPS in production (validate on save).
- [x] **AC-3.7.2** Secret stored hashed or encrypted at rest (document choice).

---

## 4. Clients (UI + server actions / API)

### 4.1 — List clients

**ACs**

- [ ] **AC-4.1.1** List shows only current user’s clients.
- [ ] **AC-4.1.2** Empty state copy + CTA to create client.
- [ ] **AC-4.1.3** Search or filter by name (optional AC; nice for 10+ clients).

---

### 4.2 — Create client

**ACs**

- [ ] **AC-4.2.1** Required: `name`, `external_id`. Optional: contact, notes.
- [ ] **AC-4.2.2** Duplicate `external_id` for same user returns validation error before DB unique violation.
- [ ] **AC-4.2.3** Success redirects to client detail or list with toast.

---

### 4.3 — Edit / delete client

**ACs**

- [ ] **AC-4.3.1** Edit preserves `external_id` immutability OR document migration path for API consumers (recommend immutable).
- [ ] **AC-4.3.2** Delete blocked if active subscriptions exist OR cascades documented (recommend block with message).
- [ ] **AC-4.3.3** Delete removes client row; subscriptions handled per rule above.

---

## 5. Subscriptions (UI + logic)

### 5.1 — Create subscription

**ACs**

- [ ] **AC-5.1.1** Client picker scoped to user’s clients only.
- [ ] **AC-5.1.2** On create, first invoice generated with `due_date` = first period end (see §6).
- [ ] **AC-5.1.3** Initial `status` is `active` when no overdue invoice exists.

---

### 5.2 — List / detail subscription

**ACs**

- [ ] **AC-5.2.1** Detail shows linked client, amount, currency, cycle, grace, status badge.
- [ ] **AC-5.2.2** Related invoices listed chronologically.

---

### 5.3 — Edit subscription (limited MVP)

**ACs**

- [ ] **AC-5.3.1** Changing amount affects **next** generated invoice only OR document proration (MVP: next cycle only).
- [ ] **AC-5.3.2** Changing grace applies to future enforcement runs from save time forward.

---

## 6. Invoice generation

### 6.1 — Generator function (idempotent per period)

**Scope:** Given subscription + “as of” date, create next `pending` invoice if current period has no pending/unpaid invoice for that period end.

**ACs**

- [ ] **AC-6.1.1** Monthly: `due_date` aligns with same calendar day as `start_date` (document month-end edge case).
- [ ] **AC-6.1.2** Custom N days: `due_date` = previous period end + N days.
- [ ] **AC-6.1.3** Calling generator twice for same period does not duplicate invoice (unique constraint or check).

---

### 6.2 — Manual “generate now” (optional admin)

**ACs**

- [ ] **AC-6.2.1** Button triggers same code path as cron (shared module).
- [ ] **AC-6.2.2** UI shows last generated invoice date per subscription.

---

### 6.3 — Cron: invoice generation job

**ACs**

- [ ] **AC-6.3.1** Daily job runs for all `active`/`grace`/`overdue` subscriptions (not `blocked` if policy says stop billing — document).
- [ ] **AC-6.3.2** Job authenticated (secret header or Vercel cron signature).

---

## 7. Payments (manual)

### 7.1 — Mark invoice paid (UI)

**ACs**

- [ ] **AC-7.1.1** Only `pending` or `overdue` invoices can be paid (not already `paid`).
- [ ] **AC-7.1.2** Method required from predefined list + optional note.
- [ ] **AC-7.1.3** On success: invoice `paid`, subscription status recalculated to `active` if was overdue/grace (document rules).

---

### 7.2 — Payment record audit

**ACs**

- [ ] **AC-7.2.1** Payment row visible on invoice detail.
- [ ] **AC-7.2.2** Emit `payment.received` webhook after commit (see §11).

---

## 8. Costs

### 8.1 — CRUD costs per client

**ACs**

- [ ] **AC-8.1.1** Create cost linked to client; category + amount + month (or period).
- [ ] **AC-8.1.2** Edit/delete own rows only.

---

### 8.2 — Profit rollup query

**ACs**

- [ ] **AC-8.2.1** For selected month: per-client revenue (sum paid invoices in month) minus costs in month.
- [ ] **AC-8.2.2** Document timezone for “month” (UTC vs user TZ — pick one and document).

---

## 9. Dashboard

### 9.1 — Metrics cards

**Metrics:** MRR, expected revenue (pending invoices in period), collected revenue (payments in period), overdue count + amount, profit (from §8.2).

**ACs**

- [ ] **AC-9.1.1** All figures scoped to `user_id`.
- [ ] **AC-9.1.2** MRR definition documented (e.g. sum of active subscription amounts normalized to monthly).
- [ ] **AC-9.1.3** Loading and error states for each section.

---

### 9.2 — Overdue / action list

**ACs**

- [ ] **AC-9.2.1** List top N overdue invoices with client link and “record payment” CTA.
- [ ] **AC-9.2.2** Empty overdue state shown when none.

---

## 10. Enforcement engine

### 10.1 — Status transition rules (pure function + tests)

**Rules (MVP):**

1. If latest open invoice `due_date` < today and not paid → subscription `overdue`; invoice `overdue`.
2. If overdue and days since `due_date` > `grace_period_days` → subscription `blocked`.
3. If within grace (overdue but ≤ grace days) → subscription `grace` (optional distinct state) or keep `overdue` with `grace_until` in API only — **pick one and document**.

**ACs**

- [ ] **AC-10.1.1** Unit tests for: active → overdue → blocked with fixed clock.
- [ ] **AC-10.1.2** Paying invoice moves subscription back to `active` and clears blocked timestamp.

---

### 10.2 — Daily enforcement cron

**ACs**

- [ ] **AC-10.2.1** Idempotent: same cron run twice same day does not duplicate webhook sends for same transition (dedupe key per subscription+day+event).
- [ ] **AC-10.2.2** Emits `payment.overdue` when entering overdue; `subscription.blocked` when entering blocked.

---

## 11. Webhooks

### 11.1 — Endpoint CRUD (dashboard)

**ACs**

- [ ] **AC-11.1.1** User can add URL + select events.
- [ ] **AC-11.1.2** Test webhook button sends sample payload with signature header.

---

### 11.2 — Delivery worker (sync MVP acceptable)

**ACs**

- [ ] **AC-11.2.1** Payload JSON includes `event`, `timestamp`, `data` (invoice id, client external_id, amounts).
- [ ] **AC-11.2.2** Signature: HMAC-SHA256 with endpoint secret (document header name).
- [ ] **AC-11.2.3** Failed POST (non-2xx) logged in `webhook_deliveries`; retry policy documented (MVP: single retry optional).

---

## 12. Public API v1 (API key)

**Base path:** e.g. `/api/v1/...` or `/v1/...` behind same app.

### 12.1 — Middleware: API key auth

**ACs**

- [ ] **AC-12.1.1** Missing/invalid Bearer key → 401 JSON body `{ "error": "unauthorized" }`.
- [ ] **AC-12.1.2** Key resolves to exactly one `user_id`; all queries scoped.

---

### 12.2 — `GET /v1/access/:externalId`

**ACs**

- [ ] **AC-12.2.1** Unknown `externalId` for user → 404.
- [ ] **AC-12.2.2** Response JSON: `status`, `next_due_date`, `grace_until` (ISO dates or null).
- [ ] **AC-12.2.3** Response matches dashboard-computed status for same client.

---

### 12.3 — `POST /v1/payments`

**Body:** e.g. `{ "external_id", "amount", "method", "note", "invoice_id"? }`.

**ACs**

- [ ] **AC-12.3.1** Idempotency key header optional; if duplicate within 24h same payload → same response (optional AC).
- [ ] **AC-12.3.2** Marks matching open invoice paid; 400 if no matching invoice.

---

### 12.4 — `GET /v1/subscriptions/:externalId`

**ACs**

- [ ] **AC-12.4.1** Returns subscription fields + last N invoices summary.
- [ ] **AC-12.4.2** 404 if client external id unknown.

---

### 12.5 — `POST /v1/block/:externalId`

**ACs**

- [ ] **AC-12.5.1** Sets subscription to `blocked` immediately.
- [ ] **AC-12.5.2** Emits `subscription.blocked` webhook.

---

## 13. Reminders (basic)

### 13.1 — Notification preferences (MVP minimal)

**Scope:** Store per-user flags: remind before (days), on due, after (days). Channel: email or in-app only.

**ACs**

- [ ] **AC-13.1.1** User can toggle which reminders are on.
- [ ] **AC-13.1.2** If email: integrate with Resend/SMTP; document template variables.

---

### 13.2 — Reminder cron

**ACs**

- [ ] **AC-13.2.1** Before due: one email per invoice per threshold (e.g. 3 days before) deduped per invoice+threshold.
- [ ] **AC-13.2.2** On due + after due: same dedupe rules.
- [ ] **AC-13.2.3** Paid invoice cancels pending reminders for that invoice.

---

## 14. Deploy & quality

### 14.1 — Production env

**ACs**

- [ ] **AC-14.1.1** All secrets in host env; no secrets in repo.
- [ ] **AC-14.1.2** Cron routes registered in `vercel.json` (or host equivalent).

---

### 14.2 — Smoke checklist post-deploy

**ACs**

- [ ] **AC-14.2.1** Register → create client → subscription → invoice appears → pay → access API returns `active`.
- [ ] **AC-14.2.2** Simulate overdue (test clock or backdated invoice) → access API returns `overdue`/`blocked` per rules.

---

### 14.3 — Error monitoring (recommended)

**ACs**

- [ ] **AC-14.3.1** Unhandled API errors logged with request id.
- [ ] **AC-14.3.2** Cron failures alert (email or Slack optional).

---

## 15. Dependency map (microphase order)

```text
1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 2.4
              ↓
3.1–3.7 (3.6–3.7 can follow 3.3)
              ↓
4.* → 5.* → 6.* → 7.* → 8.* → 9.*
              ↓
10.* (needs 6, 7) → 11.* → 12.* (needs 3.6, 10)
13.* can parallel after 6–7
14.* last
```

---

## 16. Non-goals (MVP) — unchanged

- Stripe / automatic capture  
- Tax/legal invoicing  
- Multi-user organizations  
- Rate limiting v1 API (document “future”)  

---

## 17. Open decisions (resolve before build)

| Topic | Options |
|-------|--------|
| Magic link vs password MVP | Better Auth supports both; pick one for faster ship. |
| `grace` vs `overdue` only | API can expose `grace_until` while DB keeps single overdue flag. |
| Partial payments | MVP full pay only recommended. |
| Blocked still invoicing | Usually stop new invoices until unblocked. |

---

*End of technical roadmap. Check off ACs as you implement; add sub-ACs if a microphase splits across PRs.*
