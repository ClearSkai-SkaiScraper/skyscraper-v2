# SkaiScraper — AI Agent Instructions

## Platform Overview

SkaiScraper is a **Next.js 14 App Router** SaaS platform for storm restoration contractors.  
Multi-tenant (Clerk auth + Prisma org scoping), deployed on Vercel, Supabase Postgres (243 Prisma models).

## Architecture — Three Surfaces

| Surface | Route group | Auth | Layout |
|---------|------------|------|--------|
| Pro Dashboard | `src/app/(app)/*` | Clerk required | `(app)/layout.tsx` → Sidebar + Topbar |
| Client Portal | `src/app/portal/*` | Client auth | Separate client layout |
| Marketing | `src/app/(marketing)/*` | Public | Landing pages |

**Middleware** (`middleware.ts`) is the **single authority** for cross-surface routing. It reads `x-user-type` (pro vs client) and redirects accordingly. Never add redirect logic in layouts.

## Critical Patterns

### Imports & Path Aliases
```typescript
import prisma from "@/lib/prisma";       // Singleton — NEVER new PrismaClient()
import { getAIClient } from "@/lib/ai";  // Lazy singleton — NEVER new OpenAI()
import { cn } from "@/lib/utils";         // Tailwind class merger (clsx + twMerge)
```
`@/*` maps to both `./src/*` and `./` root (see `tsconfig.json`).

### Auth in API Routes — Three Tiers
```typescript
// Tier 1 (standard CRUD) — HOF wrapper, provides userId + orgId:
export const POST = withOrgScope(async (req, { userId, orgId }) => { ... });

// Tier 2 (enterprise) — returns auth object or NextResponse:
const auth = await requireAuth();
if (auth instanceof NextResponse) return auth;
const { orgId, userId, role } = auth;

// Tier 3 (simple) — direct Clerk:
const { userId, orgId } = await auth();
```

### Tenant Isolation — MANDATORY
Every Prisma query **must** filter by `orgId`. The `resolveOrg()` function in `src/lib/auth/tenant.ts` is the source of truth for org context. It resolves from the DB membership table, not Clerk directly.

### API Route Conventions
```typescript
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Zod schema at top, validate in handler, catch ZodError → 400
// Use apiError(status, code, message) from @/lib/apiError
```

### RBAC — Role Hierarchy
`admin (4) > manager (3) > member (2) > viewer (1)`  
Server: `await requireRole("ADMIN")` or `await requirePermission("claims:create")`  
Client: `<RBACGuard permission="claims:delete">` or `<RBACGuard minimumRole="manager">`  
Defined in `src/components/rbac/RBACGuard.tsx` and `src/lib/rbac.ts`.

### UI Components
- **Design system:** shadcn/ui + CVA variants + Tailwind CSS with HSL variables
- **Dark mode:** `class` strategy — always support both modes
- **Cards:** `<Card>` from `@/components/ui/card`, glass variant: `bg-white/80 backdrop-blur-sm dark:bg-slate-900/60`
- **Page structure:** `<PageHero>` header → stat cards grid → content area with `<Tabs>` or data tables
- Button variants: `default`, `primaryBubble`, `secondary`, `outline`, `ghost`, `destructive`, `success`

### State Management
Zustand stores with `persist` middleware in `src/stores/`. Convention: `use___Store` hook naming.

### PDF/Report Generation — Three Patterns
1. **Server AI content** → `makePdfContent()` from `@/lib/ai`
2. **Client HTML-to-PDF** → `html2canvas` + `jsPDF` (lazy-loaded)
3. **React-PDF** → `@react-pdf/renderer` for structured documents

### Logging
```typescript
import { logger } from "@/lib/logger";
logger.info("[CLAIMS_CREATE]", { orgId, claimId });
```
Sentry-integrated structured logger. Tag format: `[MODULE_ACTION]`.

### Rate Limiting
Upstash Redis with presets in `src/lib/rateLimit.ts`: `standard` (10/min), `relaxed` (20/min), `generous` (30/min), `ai` (5/min).

## Developer Workflows

```bash
pnpm install && npx prisma generate  # Setup
pnpm dev                              # Dev server (Next.js)
pnpm test:unit                        # Vitest unit tests
pnpm test:smoke                       # Playwright smoke tests
pnpm lint:core                        # ESLint (src/app, components, lib)
pnpm typecheck                        # TypeScript strict check
pnpm build                            # Production build (8GB heap)
```

Prisma schema: `prisma/schema.prisma` (243 models). Migrations: raw SQL in `db/migrations/`.  
IDs: `createId()` from `@paralleldrive/cuid2` — never auto-increment.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/app/(app)/` | All pro dashboard pages (100+ routes) |
| `src/app/api/` | API routes (130+ endpoints) |
| `src/components/ui/` | 60+ shadcn/ui primitives |
| `src/components/` | Feature components (claims, billing, tasks, etc.) |
| `src/lib/` | Shared utilities (prisma, auth, ai, logger, rateLimit) |
| `src/stores/` | Zustand state stores |
| `src/schemas/` | Zod validation schemas |
| `src/types/` | TypeScript type definitions |
| `emails/` | React Email templates (Resend) |
| `scripts/` | CLI tools, seeds, audits, CI helpers |

## Common Pitfalls
- `currentUser()` returns null if `auth()` wasn't called first in middleware — always ensure middleware runs
- Portal routes use `/client/sign-in` not `/sign-in` — check `isPortalRoute` in middleware
- `NEXT_REDIRECT` errors must be re-thrown in try/catch blocks (Next.js internal mechanism)
- Build phase: set `BUILD_PHASE=1` env to skip runtime-only code during `next build`
