export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth, currentUser } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { startTrial } from "@/lib/billing/trials";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId, orgId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Parse request body for optional orgName
  let requestedOrgName = "";
  try {
    const body = await request.json();
    requestedOrgName = body.orgName || "";
  } catch {
    // No body or invalid JSON - that's fine
  }

  try {
    // If there's no orgId from Clerk, create a personal Org
    let targetOrgId = orgId;
    let dbOrg;
    let createdOrg = false;

    if (!targetOrgId) {
      // Check if user already has a personal Org via user_organizations table
      const existingMembership = await prisma.user_organizations.findFirst({
        where: { userId },
        include: { Org: true },
      });

      const existingOrg = existingMembership?.Org;

      if (existingOrg) {
        dbOrg = existingOrg;
        targetOrgId = existingOrg.clerkOrgId;
      } else {
        // Create a personal Org for the user
        const orgName = requestedOrgName || `${user.firstName ?? "My"} Organization`;
        dbOrg = await prisma.org.upsert({
          where: { clerkOrgId: userId },
          update: {},
          create: {
            id: randomUUID(),
            name: orgName,
            clerkOrgId: userId,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        });
        targetOrgId = userId;
        createdOrg = true;

        // Create membership
        await prisma.user_organizations.create({
          data: {
            id: randomUUID(),
            userId,
            organizationId: dbOrg.id,
            role: "ADMIN",
            createdAt: new Date(),
          },
        });

        // Start trial if FREE_BETA mode
        if (process.env.FREE_BETA === "true") {
          try {
            await startTrial(dbOrg.id, "solo");
            logger.debug(`[ORG_CREATION] Started 72h trial for personal Org ${dbOrg.id}`);
          } catch (trialError) {
            logger.error("[ORG_CREATION] Failed to start trial:", trialError);
          }
        }
      }
    } else {
      // Check if Org exists for this organization ID
      const existingOrg = await prisma.org.findUnique({
        where: { clerkOrgId: orgId },
      });

      if (!existingOrg) {
        // Create Org from Clerk organization
        dbOrg = await prisma.org.upsert({
          where: { clerkOrgId: orgId! },
          update: {},
          create: {
            id: randomUUID(),
            name: `Organization`,
            clerkOrgId: orgId!,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any,
        });
        createdOrg = true;

        // Create membership
        await prisma.user_organizations.create({
          data: {
            id: randomUUID(),
            userId,
            organizationId: dbOrg.id,
            role: "ADMIN",
            createdAt: new Date(),
          },
        });

        // Start trial if FREE_BETA mode
        if (process.env.FREE_BETA === "true") {
          try {
            await startTrial(dbOrg.id, "business");
            logger.debug(`[ORG_CREATION] Started 72h trial for team Org ${dbOrg.id}`);
          } catch (trialError) {
            logger.error("[ORG_CREATION] Failed to start trial:", trialError);
          }
        }
      } else {
        dbOrg = existingOrg;
      }
    }

    // Check if user exists in database
    const existingUser = await prisma.users.findUnique({
      where: { clerkUserId: userId },
    });

    let dbUser;
    let createdUser = false;

    if (!existingUser) {
      // Create user in database
      dbUser = await prisma.users.create({
        data: {
          id: randomUUID(),
          clerkUserId: userId,
          email: user.emailAddresses[0]?.emailAddress || "",
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null,
          role: "ADMIN",
          orgId: dbOrg.id,
        } as any,
      });
      createdUser = true;
    } else {
      dbUser = existingUser;
    }

    return NextResponse.json({
      ok: true,
      orgId: dbOrg.id,
      userId: dbUser.id,
      createdOrg,
      createdUser,
    });
  } catch (error) {
    logger.error("[ME_INIT]", { error, userId });
    return NextResponse.json(
      { ok: false, error: "Failed to initialize user and Org" },
      { status: 500 }
    );
  }
}
