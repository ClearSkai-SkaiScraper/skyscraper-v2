# db/archive — Legacy Seed & Cleanup Scripts

These SQL files were the original seed data scripts used during development.
They have been superseded by **TypeScript-based Prisma seeders**:

| Canonical Command        | Script                        | Purpose                                                                                             |
| ------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm seed:demo`         | `prisma/seed-demo.ts`         | Full demo org (Arizona Storm Demo) with claims, contacts, properties, trade partners, notifications |
| `pnpm seed:minimal-demo` | `prisma/seed-minimal-demo.ts` | Minimal 2-user demo with FK-safe cleanup                                                            |
| `pnpm seed:vendors`      | `scripts/seed-vendors.ts`     | Vendor + VIN data                                                                                   |
| `pnpm demo:seed`         | `scripts/demo-seed.ts`        | Alternative demo seeder                                                                             |

## Why archived?

1. **Schema drift** — SQL files reference columns/tables that may no longer exist
2. **Org ID coupling** — Many files hardcode specific org UUIDs
3. **No idempotency** — SQL `INSERT` fails on duplicate keys; TS seeders use `upsert`
4. **No FK ordering** — TS seeders handle dependency order programmatically

## If you need vendor data

Use `pnpm seed:vendors` — it's the canonical vendor seeder.

## If you need demo data

Use `pnpm seed:demo` — creates a complete Arizona Storm Demo org.
