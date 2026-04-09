# TradesConnection Schema Cleanup — Migration Plan

> **Status**: PENDING — requires production DB row-count verification  
> **Lane**: F of MASTER_EXECUTION_TODO  
> **Risk**: LOW (PascalCase model has 0 known consumers)

## Problem

Two competing models in `prisma/schema.prisma`:

| Model                           | Table              | Fields                                                                           | Status                                      |
| ------------------------------- | ------------------ | -------------------------------------------------------------------------------- | ------------------------------------------- |
| `TradesConnection` (PascalCase) | `TradesConnection` | id, followerId, followingId, createdAt                                           | **DEAD** — 0 code consumers, likely 0 rows  |
| `tradesConnection` (camelCase)  | `tradesConnection` | id, requesterId, addresseeId, status, message, connectedAt, createdAt, updatedAt | **ACTIVE** — 7 files, ~34 Prisma operations |

Prisma resolves `prisma.tradesConnection` to the PascalCase model's TypeScript types,
but runtime dispatches to the camelCase table. All 7 consumer files work around this
with `(prisma.tradesConnection as any)` casts.

## Affected Files (7)

1. `src/app/api/network/clients/[slug]/profile/route.ts`
2. `src/app/api/trades/actions/route.ts`
3. `src/app/api/trades/company/seats/accept/route.ts`
4. `src/app/api/trades/connections/route.ts`
5. `src/app/api/trades/mutual/route.ts`
6. `src/app/api/trades/profile/route.ts`
7. `src/app/(app)/contacts/page.tsx`

## Migration Steps

### Step 1: Verify zero rows in production

```sql
SELECT COUNT(*) FROM "TradesConnection";
-- Expected: 0
```

### Step 2: Drop the PascalCase model

```sql
-- db/migrations/YYYYMMDD_drop_pascal_trades_connection.sql
DROP TABLE IF EXISTS "TradesConnection";
```

### Step 3: Remove PascalCase model from Prisma schema

Delete the `model TradesConnection { ... }` block from `prisma/schema.prisma`.
Also remove any references in `TradesProfile` model.

### Step 4: Regenerate Prisma client

```bash
npx prisma generate
```

### Step 5: Remove all `as any` casts

After regeneration, `prisma.tradesConnection` will correctly type to the camelCase
model's fields (requesterId, addresseeId, status, etc.). Remove all 8 alias
declarations across the 7 files.

### Step 6: Verify

```bash
pnpm typecheck && pnpm test:unit && pnpm lint:ship
```
