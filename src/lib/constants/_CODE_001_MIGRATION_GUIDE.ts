/**
 * ============================================================================
 * CODE-001: Console.log → Logger Migration Guide
 * ============================================================================
 *
 * There are ~53 console.log() statements in source code that should use the
 * structured logger (`import { logger } from "@/lib/logger"`).
 *
 * WHY:
 * - console.log doesn't go to Sentry/Datadog in production
 * - No structured context (orgId, userId, correlationId)
 * - No log levels — can't filter by severity
 * - Leaks internal state in browser console (client components)
 *
 * MIGRATION PATTERN:
 * ```
 * // ❌ Before
 * console.log("[AI SUCCESS]", { tag, model, tokensUsed });
 *
 * // ✅ After
 * logger.info("[AI_SUCCESS]", { tag, model, tokensUsed });
 * ```
 *
 * PRIORITY ORDER:
 * 1. src/lib/ai/client.ts — AI cost/perf logging
 * 2. src/lib/identity/middleware.ts — auth flow debugging
 * 3. src/lib/evidence/storage.ts — file upload logging
 * 4. src/lib/org/getActiveOrgContext.ts — org resolution
 * 5. src/lib/ai/reportGenerator.ts — report generation
 * 6. src/lib/intel/automation/ — automation engine
 * 7. Everything else in src/lib/
 *
 * CLIENT COMPONENTS (src/components/, src/app/ "use client" pages):
 * - These CAN use console.log in development
 * - Wrap in `if (process.env.NODE_ENV === 'development')` for dev-only logging
 * - Or use a client-side logger that strips in production builds
 *
 * AUTOMATED FIX:
 * Run: pnpm lint:core --fix (if the ESLint rule no-console is configured)
 * Or use the VS Code search-and-replace with regex:
 *   Find:    console\.log\(
 *   Replace: logger.debug(
 *   (then manually review log levels)
 */

export {};
