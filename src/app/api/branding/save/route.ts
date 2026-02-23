export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/branding/save
 *
 * Saves organization branding using the database UPSERT function.
 * This prevents duplicates and handles updates gracefully.
 *
 * Uses upsert_org_branding() Postgres function which ensures:
 * - No duplicate branding records
 * - Safe defaults for missing fields
 * - Idempotent operations
 *
 * ============================================================================
 * 🧪 QA CHECKLIST - BRANDING PERSISTENCE
 * ============================================================================
 * Test 1: Save New Branding
 *   1. Navigate to /settings/branding
 *   2. Fill in Company Name (REQUIRED), email, phone, pick colors
 *   3. Click "Complete Setup"
 *   4. Expected: Redirects to /dashboard?branding=saved
 *   5. Check: Footer shows company name, navbar shows colors
 *   6. Refresh page → Data persists
 *
 * Test 2: Update Existing Branding
 *   1. Go back to /settings/branding
 *   2. Change company name (e.g., "ABC Roofing LLC" → "ABC Roofing & Construction")
 *   3. Save again
 *   4. Expected: Updates existing record (no duplicates in org_branding table)
 *   5. Check: SELECT * FROM org_branding WHERE orgId='xxx' returns ONLY 1 row
 *
 * Test 3: Logo Upload
 *   1. Click "Upload Logo" and select image
 *   2. Expected: Image uploads to /api/branding/upload, returns URL
 *   3. Save form
 *   4. Refresh → Logo displays in navbar/footer
 *
 * 🔍 DATABASE VERIFICATION:
 *   Run: SELECT * FROM org_branding WHERE orgId='<your_org_id>';
 *   Expect: Exactly 1 row with updated companyName, logoUrl, colors
 *
 * 🐛 KNOWN ISSUES FIXED:
 *   - ✅ Changed prisma.org → prisma.Org (table name mismatch)
 *   - ✅ Uses upsert_org_branding() function to prevent duplicates
 *   - ✅ Revalidates paths so changes appear immediately
 * ============================================================================
 */

import { logger } from "@/lib/logger";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { hasTrackedEvent, PRODUCT_EVENTS, trackProductEvent } from "@/lib/analytics/track";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";
import { pool } from "@/server/db";

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      logger.error("[branding/save] ❌ Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgCtx = await getActiveOrgContext({ required: true });
    if (!orgCtx.ok) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const org = await prisma.org.findUnique({
      where: { id: orgCtx.orgId },
      select: { id: true, clerkOrgId: true },
    });
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }
    const body = await req.json();
    const {
      companyName,
      license,
      phone,
      email,
      website,
      colorPrimary,
      colorAccent,
      logoUrl,
      teamPhotoUrl,
      coverPhotoUrl,
    } = body;

    // Use internal DB org UUID consistently (matches PDF branding fetchers)
    const resolvedOrgId = org.id;

    // Backward-compat: migrate legacy records that used Clerk orgId as orgId
    if (org.clerkOrgId && org.clerkOrgId !== resolvedOrgId) {
      try {
        const legacyCheck = await pool.query(
          'SELECT 1 FROM org_branding WHERE "orgId" = $1 LIMIT 1',
          [org.clerkOrgId]
        );
        const currentCheck = await pool.query(
          'SELECT 1 FROM org_branding WHERE "orgId" = $1 LIMIT 1',
          [resolvedOrgId]
        );

        if (legacyCheck.rowCount > 0 && currentCheck.rowCount === 0) {
          await pool.query('UPDATE org_branding SET "orgId" = $1 WHERE "orgId" = $2', [
            resolvedOrgId,
            org.clerkOrgId,
          ]);
        }
      } catch (e) {
        // Non-fatal: proceed with save; migration best-effort
        logger.warn("[branding/save] legacy orgId migration skipped:", e);
      }
    }

    logger.info(`[branding/save] 💾 Saving branding for org ${resolvedOrgId}:`, {
      companyName,
      hasLogo: !!logoUrl,
      userId: user.id,
    });

    // Use Prisma upsert — avoids ON CONFLICT constraint mismatch
    await prisma.org_branding.upsert({
      where: { orgId: resolvedOrgId },
      update: {
        ownerId: user.id,
        companyName: companyName || undefined,
        license: license ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        website: website ?? undefined,
        colorPrimary: colorPrimary || "#117CFF",
        colorAccent: colorAccent || "#FFC838",
        logoUrl: logoUrl ?? undefined,
        teamPhotoUrl: teamPhotoUrl ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: resolvedOrgId,
        orgId: resolvedOrgId,
        ownerId: user.id,
        companyName: companyName ?? "Your Roofing Company LLC",
        license: license ?? null,
        phone: phone ?? null,
        email: email ?? null,
        website: website ?? null,
        colorPrimary: colorPrimary ?? "#117CFF",
        colorAccent: colorAccent ?? "#FFC838",
        logoUrl: logoUrl ?? null,
        teamPhotoUrl: teamPhotoUrl ?? null,
        updatedAt: new Date(),
      },
    });

    // Note: brandingCompleted field doesn't exist in org schema
    // Branding completion is now derived from org_branding table fields

    // Track first-time branding completion
    const isFirstBranding = !(await hasTrackedEvent(
      resolvedOrgId,
      PRODUCT_EVENTS.ORG_BRANDING_COMPLETED
    ));
    if (isFirstBranding) {
      await trackProductEvent({
        orgId: resolvedOrgId,
        userId: user.id,
        eventName: PRODUCT_EVENTS.ORG_BRANDING_COMPLETED,
        payload: { companyName, hasLogo: !!logoUrl },
      });
    }

    // Revalidate all paths that display branding
    revalidateTag(`branding:${resolvedOrgId}`);
    revalidatePath("/dashboard");
    revalidatePath("/settings/branding");
    revalidatePath("/", "layout"); // Revalidate root layout for header branding

    logger.debug(`[branding/save] ✅ Successfully saved branding for org ${resolvedOrgId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error("[branding/save] ❌ Error saving branding:", {
      message: "Internal server error",
      code: error.code,
      stack: error.stack?.split("\n")[0], // First line of stack for context
    });
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
