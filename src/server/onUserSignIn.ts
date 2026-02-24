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
    // 1) Ensure Org exists
    await prisma.org.upsert({
      where: { clerkOrgId: orgId },
      create: {
        id: randomUUID(),
        clerkOrgId: orgId,
        name: "Your Organization",
        updatedAt: new Date(),
      },
      update: {},
    });

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
        orgId: orgId,
        role: "ADMIN",
        lastSeenAt: new Date(),
      },
      update: {
        email: realEmail || undefined,
      },
    });

    // 3) Ensure branding exists with sensible defaults
    await prisma.org_branding.upsert({
      where: {
        id: `${orgId}_branding`,
      },
      create: {
        id: `${orgId}_branding`,
        orgId: orgId,
        ownerId: userId,
        companyName: "Your Company",
        colorPrimary: "#117CFF",
        colorAccent: "#FFC838",
        updatedAt: new Date(),
      },
      update: {},
    });

    console.log(`[ONBOARDING] ✅ Org/User/Branding ready for ${userId}`);
    return { ok: true };
  } catch (error) {
    console.error("[ONBOARDING] ❌ Failed:", error);
    return { ok: false, error };
  }
}
