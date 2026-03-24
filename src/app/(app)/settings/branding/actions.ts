"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { BRAND_ACCENT, BRAND_PRIMARY } from "@/lib/constants/branding";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { pool } from "@/server/db";

export async function saveBranding(formData: FormData) {
  const ctx = await safeOrgContext();

  if (!ctx.ok || !ctx.userId || !ctx.orgId) {
    return { success: false, error: "Unauthorized" };
  }

  const userId = ctx.userId;
  // CRITICAL: Use DB UUID, not Clerk orgId — this was the root cause of
  // branding "disappearing" after updates (records were keyed to Clerk ID
  // but all readers looked up by DB UUID).
  const resolvedOrgId = ctx.orgId;

  const companyName = formData.get("companyName") as string;
  const license = formData.get("license") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const website = formData.get("website") as string;
  const colorPrimary = formData.get("colorPrimary") as string;
  const colorAccent = formData.get("colorAccent") as string;
  const logoUrl = formData.get("logoUrl") as string;
  const teamPhotoUrl = formData.get("teamPhotoUrl") as string;

  try {
    // Migrate any legacy records keyed by Clerk orgId to DB UUID
    const org = await prisma.org.findUnique({
      where: { id: resolvedOrgId },
      select: { clerkOrgId: true },
    });
    if (org?.clerkOrgId && org.clerkOrgId !== resolvedOrgId) {
      try {
        const legacyCheck = await pool.query(
          'SELECT 1 FROM org_branding WHERE "orgId" = $1 LIMIT 1',
          [org.clerkOrgId]
        );
        const currentCheck = await pool.query(
          'SELECT 1 FROM org_branding WHERE "orgId" = $1 LIMIT 1',
          [resolvedOrgId]
        );
        if ((legacyCheck.rowCount ?? 0) > 0 && (currentCheck.rowCount ?? 0) === 0) {
          await pool.query('UPDATE org_branding SET "orgId" = $1 WHERE "orgId" = $2', [
            resolvedOrgId,
            org.clerkOrgId,
          ]);
          logger.info("[saveBranding] Migrated legacy Clerk orgId branding to DB UUID");
        }
      } catch {
        // Non-fatal — proceed with save
      }
    }

    // Use Prisma upsert for reliability (avoids SQL function schema issues)
    await prisma.org_branding.upsert({
      where: { orgId: resolvedOrgId },
      update: {
        ownerId: userId,
        companyName: companyName || undefined,
        license: license ?? undefined,
        phone: phone ?? undefined,
        email: email ?? undefined,
        website: website ?? undefined,
        colorPrimary: colorPrimary || BRAND_PRIMARY,
        colorAccent: colorAccent || "#FFC838",
        logoUrl: logoUrl ?? undefined,
        teamPhotoUrl: teamPhotoUrl ?? undefined,
        updatedAt: new Date(),
      },
      create: {
        id: resolvedOrgId,
        orgId: resolvedOrgId,
        ownerId: userId,
        companyName: companyName ?? "Your Roofing Company LLC",
        license: license ?? null,
        phone: phone ?? null,
        email: email ?? null,
        website: website ?? null,
        colorPrimary: colorPrimary ?? BRAND_PRIMARY,
        colorAccent: colorAccent ?? BRAND_ACCENT,
        logoUrl: logoUrl ?? null,
        teamPhotoUrl: teamPhotoUrl ?? null,
        updatedAt: new Date(),
      },
    });

    // Revalidate all paths that display branding
    revalidateTag(`branding:${resolvedOrgId}`);
    revalidatePath("/dashboard");
    revalidatePath("/settings/branding");
    revalidatePath("/", "layout"); // Revalidate root layout for header branding

    return { success: true };
  } catch (error) {
    logger.error("[saveBranding] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function completeBrandingAndRedirect(formData: FormData) {
  const result = await saveBranding(formData);

  if (result.success) {
    redirect("/dashboard?branding=saved");
  } else {
    // Return error instead of throwing in server action
    return { success: false, error: result.error || "Failed to save branding" };
  }
}
