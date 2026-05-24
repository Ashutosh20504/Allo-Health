# Allo Inventory — Reservation System

A full-stack Next.js 14 App Router application that solves the **checkout race condition problem** for a multi-warehouse inventory platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL (Supabase) |
| Cache/Locks | Redis (Upstash) |
| Validation | Zod |
| Styling | Tailwind CSS |

---

## Local Setup

### 1. Clone & Install
```bash
git clone <repo>
cd allo-health
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Supabase → Database → Connection string → ORM (port 6543) |
| `DIRECT_URL` | Supabase → Database → Connection string → Direct (port 5432) |
| `REDIS_URL` | Upstash Console → Create Database → REST URL |
| `CRON_SECRET` | Any random string |

>  **Important:** If your password contains special characters like `[`, `@`, `]`, URL-encode them:
> - `[` → `%5B`
> - `@` → `%40`  
> - `]` → `%5D`

### 3. Run Database Migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed the Database
```bash
npm run db:seed
```

This creates:
- **3 Products:** Wireless Headphones, Mechanical Keyboard, USB-C Hub
- **2 Warehouses:** Mumbai Hub, Delhi Hub
- **6 Inventory rows** — with deliberately low stock on some combinations to demonstrate 409 behavior:
  - Mechanical Keyboard (Delhi): **1 unit** — try reserving 2 to trigger 409!

### 5. Start the Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Architecture

### How `SELECT FOR UPDATE` Prevents Double-Reservation

When two simultaneous requests both try to reserve the last unit, a naive implementation can fail:

```
Thread A: CHECK available >= 1 ✓     Thread B: CHECK available >= 1 ✓
Thread A: UPDATE reservedUnits + 1   Thread B: UPDATE reservedUnits + 1
                                     → Both succeed, stock goes negative!
```

Our implementation wraps everything in a **Prisma `$transaction`** with a raw SQL row-level lock:

```sql
-- This locks the row exclusively; Thread B waits here until Thread A commits
SELECT * FROM "Inventory"
WHERE "productId" = $1 AND "warehouseId" = $2
FOR UPDATE;
```

```
Thread A: LOCK row ✓                 Thread B: LOCK row... ⏳ (waiting)
Thread A: CHECK available >= 1 ✓    
Thread A: UPDATE reservedUnits + 1   
Thread A: COMMIT & release lock      
                                     Thread B: LOCK row ✓ (acquired)
                                     Thread B: CHECK available >= 1 ✗ (0 left)
                                     Thread B: ROLLBACK → 409 response
```

PostgreSQL serializes the requests at the database level — exactly one winner, one 409.

---

### Idempotency

`POST /api/reservations` and `POST /api/reservations/:id/confirm` support an `Idempotency-Key` header:

1. On request, check Redis for `idempotency:{key}`
2. If found → return cached response immediately (no DB writes)
3. If not found → execute handler, store result in Redis with 24h TTL

This allows clients to safely retry failed requests without double-charging or double-reserving.

---

### Vercel Cron Expiry

`vercel.json` schedules `/api/cron/expire-reservations` once per day (midnight UTC). Vercel **Hobby** plans only allow daily cron jobs — not every minute.

```json
{ "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "0 0 * * *" }] }
```

On each run:
1. Queries all `PENDING` reservations where `expiresAt < now()`
2. For each: atomically decrements `reservedUnits` and sets `status = RELEASED`
3. Uses `GREATEST(reservedUnits - quantity, 0)` to prevent going negative

The endpoint is secured with `Authorization: Bearer <CRON_SECRET>`.

**Testing locally:**
```bash
curl -H "Authorization: Bearer allo-cron-secret-2024-secure" \
  http://localhost:3000/api/cron/expire-reservations
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/products` | All products with per-warehouse stock |
| `GET` | `/api/warehouses` | All warehouses |
| `POST` | `/api/reservations` | Create reservation (race-safe) |
| `GET` | `/api/reservations/:id` | Get reservation details |
| `POST` | `/api/reservations/:id/confirm` | Confirm purchase |
| `POST` | `/api/reservations/:id/release` | Release/cancel |
| `GET` | `/api/cron/expire-reservations` | Cron: expire stale reservations |

---

## Trade-offs & What I'd Improve

| Decision | Trade-off | Improvement |
|----------|-----------|-------------|
| `SELECT FOR UPDATE` | Simple and correct; can cause lock contention at very high concurrency | Use advisory locks or an optimistic locking strategy with retry |
| Redis idempotency | Fast; Redis eviction could lose keys | DB-backed `IdempotencyKey` table as durable fallback |
| 10-minute window | Balances UX vs stock hold cost | Make it configurable per product category |
| Vercel cron (daily on Hobby) | Expired stock may be held until the next daily run | Upgrade to Pro for frequent crons, or use Supabase pg_cron / an external scheduler |
| No auth | Out of scope | Add NextAuth.js session-based reservations tied to users |
| No payment integration | Simplified checkout | Integrate Stripe with webhook to confirm on payment success |
| In-memory DB connection pooling | Works with PgBouncer (transaction mode) | Fine-tune pool settings for production load |
