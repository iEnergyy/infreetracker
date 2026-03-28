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

3. Apply migrations (Better Auth tables):

   ```bash
   pnpm db:migrate
   ```

   For schema prototyping only (no migration files), you can use `pnpm db:push` instead — prefer `db:migrate` for anything shared or deployed.

Other scripts: `pnpm db:generate` (emit SQL from `db/schema`), `pnpm db:studio` (Drizzle Studio), `pnpm auth:generate` (regenerate `db/schema/auth.ts` after Better Auth plugin changes — uses `lib/auth.stub.ts`), `pnpm verify:phase1` (env + auth tables + Better Auth load).

### Add a shadcn component

```bash
npx shadcn@latest add button
```

Components live under `components/ui`. Example:

```tsx
import { Button } from "@/components/ui/button";
```

Implementation details and day-by-day build plan → **[ROADMAP.md](./ROADMAP.md)**.
