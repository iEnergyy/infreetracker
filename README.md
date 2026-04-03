# CobroFlow *(working name)*

**Billing and subscription enforcement for freelancers** who get paid manually—bank transfers, cash, WhatsApp—without relying on Stripe or heavy accounting tools.

---

## What it is

One place to see **who owes what**, **whether they’re still “allowed” to use your apps**, and **how profitable each client is**. CobroFlow is built for informal payment cultures (e.g. LATAM) where automation means *reminders and API gates*, not card charges.

---

## The problem

- Hard to know who paid and who didn’t  
- Subscriptions slip—no clear “overdue → cut access” flow  
- Revenue vs. costs per client lives in spreadsheets or your head  
- Follow-ups are manual and easy to forget  

**Result:** lost revenue, awkward chasing, and people still using services they haven’t paid for.

---

## What you get (product)

| Area | Outcome |
|------|--------|
| **Clients & subscriptions** | Track retainers and one-offs with clear billing cycles and grace. |
| **Invoices & payments** | Generated cycles, manual “mark paid,” methods and notes. |
| **Costs** | Hosting, APIs, domains per client → profit picture. |
| **Dashboard** | MRR, expected vs collected, overdue, profit. |
| **Reminders** | Nudges before / on / after due (email or in-app first). |
| **Enforcement API** | Your other apps ask: *is this client active, grace, overdue, or blocked?* |
| **Webhooks** | React in real time when someone pays, goes overdue, or gets blocked. |

---

## Who it’s for

**Now:** freelance developers juggling multiple clients (projects + monthly maintenance).  

**Later:** agencies, designers, consultants, and small service businesses in similar payment environments.

---

## Product roadmap

### MVP (ship first)

- Client directory (contact, external ID for APIs, notes)  
- Subscriptions (amount, DOP/USD, cycle, grace, statuses)  
- Auto-generated invoices + manual payment registration  
- Cost tracking and profit per client / total  
- Dashboard metrics  
- Basic reminder flow  
- **Access API + webhooks** (core differentiator)  

### Out of scope for MVP

No Stripe, no auto payment capture, no formal tax/legal invoicing, no multi-user teams.

### Later phases

| Phase | Focus |
|-------|--------|
| **2** | WhatsApp reminders, payment confirmation in chat, smarter “did they pay?” signals |
| **3** | Deeper app integrations, public payment pages, more currencies (e.g. USDT) |
| **4** | SaaS positioning, tiers, team accounts |

### Vision

> **The billing and enforcement layer for informal economies**—manual money in, automated clarity and access control out, with WhatsApp-friendly workflows.

### How we’ll measure success

- Fewer overdue invoices and faster payment  
- Share of invoices paid on time  
- Revenue and subscriptions tracked without spreadsheet drift  

---

## Docs in this repo

| Doc | Purpose |
|-----|--------|
| **This README** | Product story, audience, and roadmap. |
| **[ROADMAP.md](./ROADMAP.md)** | Technical spec: APIs, data model, stack, enforcement logic, and build timeline. |

---

## Development

This app is built with **Next.js** and **shadcn/ui**.

### Database (Postgres + Drizzle)

1. Copy env template and fill secrets:

   ```bash
   cp .env.example .env
   ```

2. Run Postgres locally (Docker one-liner):

   ```bash
   docker run --name cobroflow-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=cobroflow -p 5432:5432 -d postgres:16
   ```

   Use a `DATABASE_URL` that matches the container (see `.env.example`).

3. Apply migrations (auth + domain tables):

   ```bash
   pnpm db:migrate
   ```

   This runs [`scripts/db-migrate.ts`](scripts/db-migrate.ts) (same migrator as Drizzle, with clearer errors). For schema prototyping only (no migration files), you can use `pnpm db:push` instead — prefer `db:migrate` for anything shared or deployed.

   **Note:** Domain migration `0001` uses composite foreign keys; PostgreSQL requires a **unique** constraint on `(user_id, id)` on `clients`, `subscriptions`, and `invoices` before those FKs are added. If you ever regenerate `0001` with `pnpm db:generate`, confirm unique indexes appear **before** the composite `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY` statements (or the migration will fail).

Other scripts: `pnpm db:generate` (emit SQL from `db/schema`), `pnpm db:studio` (Drizzle Studio), `pnpm auth:generate` (regenerate `db/schema/auth.ts` after Better Auth plugin changes — uses `lib/auth.stub.ts`), `pnpm verify:phase1` (env + auth tables + Better Auth load), `pnpm verify:phase3` (domain tables + enum types after migrations).

### Domain schema rules (Phase 3)

- **`clients.external_id`:** Must be **lowercase** and match `^[a-z0-9]+(?:-[a-z0-9]+)*$` (enforced in the database). Uniqueness is per owner: `(user_id, external_id)`.
- **Deleting a `user` row:** Domain tables use **`ON DELETE RESTRICT`** on `user_id`. For MVP there is no cascade; removing a user requires **manual cleanup** of domain rows first (or a future soft-delete / admin flow).
- **Payments (MVP):** **Full payment only** — when recording a payment, application code should require `payment.amount` to equal the invoice total and update `invoices.status` / `invoices.paid_at` in the **same transaction** (implemented with the payment API / server actions in a later phase).
- **`costs`:** Modeled with a **`billing_month`** `date` (first of the month) plus index `(user_id, client_id, billing_month)` for monthly aggregation per client.
- **API keys:** Only **`key_hash`** and **`prefix`** are stored; plain keys are shown once at creation and verified with the hash (implementation in the v1 API phase). **`revoked_at`** gates authorization (401 when set).
- **Webhooks:** **`webhook_endpoints.url`** must use **HTTPS** in production — validate on create/update in application code (localhost `http` allowed in dev). The **`secret`** column stores **ciphertext** for signing material (e.g. **AES-GCM** with a dedicated env key such as `WEBHOOK_SECRET_ENCRYPTION_KEY`); decrypt only in the worker that dispatches signed webhooks — not plaintext at rest.

### Authentication (Better Auth)

- **Handler:** `GET|POST|… /api/auth/[...all]` → `lib/auth.ts` via `toNextJsHandler` (Node runtime).
- **UI:** `/login`, `/register` (email + password). **Dashboard:** `/app/*` (layout requires a session; otherwise redirect to `/login`).
- **Server session:** `getSession()` in `lib/session.ts` wraps `auth.api.getSession({ headers })` for RSC and route handlers.
- **Smoke route:** `GET /api/protected/me` returns **401** without a valid session, **200** with `{ userId, email }`.
- **Email verification (MVP):** not required — no `sendVerificationEmail` configured, so users can sign in immediately after sign-up. Add verification later when you wire an email provider.
- **Password policy:** enforced in `lib/auth.ts` — **min 8**, **max 128** characters (aligned with Better Auth defaults).
- **Production:** set `BETTER_AUTH_URL` to the **exact public origin** of the app (e.g. `https://your-domain.com`, no trailing slash). With `NODE_ENV=production`, session cookies use **`Secure`** (HTTPS only) and **`SameSite=Lax`**. `trustedOrigins` includes `BETTER_AUTH_URL` plus local dev hosts.

### Add a shadcn component

```bash
npx shadcn@latest add button
```

Components live under `components/ui`. Example:

```tsx
import { Button } from "@/components/ui/button";
```

Implementation details and day-by-day build plan → **[ROADMAP.md](./ROADMAP.md)**.
