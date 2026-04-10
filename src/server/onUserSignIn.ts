// eslint-disable-next-line no-restricted-imports
import { clerkClient } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

import prisma from "@/lib/prisma";

/**
 * Ensures user has Org and branding on first sign-in
 * Prevents stuck/blocked states
 */
export async function ensureOrgAndBranding({ userId, orgId }: { userId: string; orgId: string }) {
  try {
    // 1) Ensure Org exists — orgId here is the CLERK orgId
    const org = await prisma.org.upsert({
      where: { clerkOrgId: orgId },
      create: {
        id: randomUUID(),
        clerkOrgId: orgId,
        name: "Your Organization",
        updatedAt: new Date(),
      },
      update: {},
      select: { id: true },
    });

    // Use DB UUID for all downstream records (consistent with save endpoint)
    const dbOrgId = org.id;

    // 2) Ensure user exists
    // Fetch real email from Clerk (fallback to null if unavailable)
    let realEmail: string | null = null;
    try {
      const clerkUser = await clerkClient.users.getUser(userId);
      realEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null;
    } catch (e) {
      console.warn(`[ONBOARDING] ⚠️ Could not fetch Clerk user for ${userId}:`, e);
    }

    await prisma.users.upsert({
      where: { clerkUserId: userId },
      create: {
        id: userId,
        clerkUserId: userId,
        email: realEmail || `unknown-${userId}@placeholder.local`,
        orgId: dbOrgId,
        role: "ADMIN",
        lastSeenAt: new Date(),
      },
      update: {
        email: realEmail || undefined,
      },
    });

    // 3) Ensure branding exists with sensible defaults
    // Migrate any legacy branding stored under Clerk orgId to DB UUID
    if (orgId !== dbOrgId) {
      try {
        const legacyBranding = await prisma.org_branding.findFirst({
          where: { orgId: orgId },
        });
        if (legacyBranding) {
          const dbBranding = await prisma.org_branding.findFirst({
            where: { orgId: dbOrgId },
          });
          if (!dbBranding) {
            // Migrate legacy record to use DB UUID
            await prisma.org_branding.update({
              where: { id: legacyBranding.id },
              data: { orgId: dbOrgId },
            });
            // eslint-disable-next-line no-console
            console.log(`[ONBOARDING] 🔄 Migrated branding from clerkOrgId to DB UUID`);
          } else {
            // Both exist — delete the legacy one (DB UUID record is canonical)
            await prisma.org_branding.delete({ where: { id: legacyBranding.id } });
            // eslint-disable-next-line no-console
            console.log(`[ONBOARDING] 🧹 Removed duplicate legacy branding record`);
          }
        }
      } catch (migrationErr) {
        console.warn(`[ONBOARDING] ⚠️ Branding migration skipped:`, migrationErr);
      }
    }

    await prisma.org_branding.upsert({
      where: { orgId: dbOrgId },
      create: {
        id: randomUUID(),
        orgId: dbOrgId,
        ownerId: userId,
        companyName: "Your Company",
        colorPrimary: "#117CFF",
        colorAccent: "#FFC838",
        updatedAt: new Date(),
      },
      update: {},
    });

    // eslint-disable-next-line no-console
    console.log(`[ONBOARDING] ✅ Org/User/Branding ready for ${userId}`);
    return { ok: true };
  } catch (error) {
    console.error("[ONBOARDING] ❌ Failed:", error);
    return { ok: false, error };
  }
}
